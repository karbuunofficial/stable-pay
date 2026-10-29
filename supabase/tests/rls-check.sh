#!/usr/bin/env bash
# Access-control regression test for the local Supabase stack. Run from the project root after changing any
# RLS policy or grant:   bash supabase/tests/rls-check.sh
#
# Mints JWTs with the local dev JWT secret (from .env) for two users, then tries to attack the API as one
# against the other, as anonymous, and with an expired token. Every "CANNOT" line must be rejected.
# Needs: the local stack running (`npx supabase start`), `docker`, `node`, and at least one user with a profile.
# Creates a throwaway second user and removes everything it created.
set -u
API=http://127.0.0.1:54321/rest/v1
ANON=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2-)
SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2-)
psql() { docker exec -i "$(docker ps --format "{{.Names}}" | grep "^supabase_db_" | head -1)" psql -U postgres -d postgres -Atq "$@"; }
mint() { node -e '
const c=require("crypto"),[sub,secret,ttl]=process.argv.slice(1);const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const now=Math.floor(Date.now()/1000);const h=b({alg:"HS256",typ:"JWT"}),p=b({role:"authenticated",aud:"authenticated",sub,iat:now,exp:now+Number(ttl)});
console.log(h+"."+p+"."+c.createHmac("sha256",secret).update(h+"."+p).digest("base64url"));' "$1" "$SECRET" "${2:-3600}"; }

A_ID=$(psql -c "select u.id from users u join profiles p on p.user_id=u.id order by u.created_at limit 1")
[ -n "$A_ID" ] || { echo 'No user with a profile yet: sign in once, then rerun.'; exit 2; }
A_NAME=$(psql -c "select coalesce(display_name,'') from users where id='$A_ID'")
A_PROF=$(psql -c "select id from profiles where user_id='$A_ID'")
psql -c "insert into users(email,username,wallet_address) values ('b-test@example.invalid','rls_b','0xBBBB000000000000000000000000000000000001') on conflict do nothing"
B_ID=$(psql -c "select id from users where username='rls_b'")
psql -c "insert into profiles(handle,name,user_id) values ('rls_b','B Test','$B_ID') on conflict do nothing"
B_PROF=$(psql -c "select id from profiles where user_id='$B_ID'")
DEMO_PROF=$(psql -c "select id from profiles where handle='kaydence'")
psql -c "insert into posts(id,author_id,body) values ('rls-b-post','$B_PROF','B owns this') on conflict do nothing"
psql -c "insert into bookmarks(post_id,profile_id) values ('rls-b-post','$B_PROF') on conflict do nothing"
psql -c "insert into transactions(from_user_id,to_user_id,from_address,to_address,amount,token_contract,token_symbol,chain_id) values ('$B_ID','$B_ID','x','y','1','c','USDC',8453)"
TA=$(mint "$A_ID"); TB=$(mint "$B_ID"); TEXP=$(mint "$A_ID" -100)

pass=0; fail=0
# req NAME EXPECT(regex on "<status> <body>") METHOD PATH TOKEN [BODY] [extra header]
req() { local name="$1" expect="$2" m="$3" path="$4" tok="$5" body="${6:-}"; local auth="$ANON"; [ -n "$tok" ] && auth="$tok"
  local out; out=$(curl -s -m 15 -w ' %{http_code}' -X "$m" "$API$path" -H "apikey: $ANON" -H "Authorization: Bearer $auth" -H 'Content-Type: application/json' -H 'Prefer: return=representation' ${body:+-d "$body"})
  if echo "$out" | grep -Eq "$expect"; then pass=$((pass+1)); echo "ok    $name"; else fail=$((fail+1)); echo "FAIL  $name  -> ${out:0:200}"; fi; }

echo "== reading"
req "anon can read public user columns"            '"username".* 200$' GET "/users?select=id,username,wallet_address&limit=1" ""
req "anon CANNOT read users.email"                 'permission denied.* 4(01|03)$' GET "/users?select=email&limit=1" ""
req "anon CANNOT select * from users"              'permission denied.* 4(01|03)$' GET "/users?select=*&limit=1" ""
req "authenticated CANNOT read users.email"        'permission denied.* 4(01|03)$' GET "/users?select=email&limit=1" "$TA"
req "anon can read posts"                          'body.* 200$' GET "/posts?select=id,body&limit=1" ""
req "anon CANNOT read bookmarks"                   'permission denied.* 4(01|03)$' GET "/bookmarks?select=*" ""
req "A sees none of B's bookmarks"                 '^\[\] 200$' GET "/bookmarks?select=*&post_id=eq.rls-b-post" "$TA"
req "A sees none of B's transactions"              '^\[\] 200$' GET "/transactions?select=id&from_user_id=eq.$B_ID" "$TA"
req "anon CANNOT read transactions"                'permission denied.* 4(01|03)$' GET "/transactions?select=id" ""
req "expired token rejected"                       '(JWT expired|PGRST303).* 401$' GET "/posts?select=id&limit=1" "$TEXP"

echo "== posts"
req "anon CANNOT post"                             'permission denied.* 4(01|03)$' POST "/posts" "" "{\"author_id\":\"$A_PROF\",\"body\":\"x\"}"
req "A CANNOT post as B"                           'row-level security.* 403$' POST "/posts" "$TA" "{\"author_id\":\"$B_PROF\",\"body\":\"impersonation\"}"
req "A CANNOT post as a demo creator"              'row-level security.* 403$' POST "/posts" "$TA" "{\"author_id\":\"$DEMO_PROF\",\"body\":\"impersonation\"}"
req "A CANNOT set is_live on own post"             'permission denied.* 4(01|03)$' POST "/posts" "$TA" "{\"author_id\":\"$A_PROF\",\"body\":\"x\",\"is_live\":true}"
req "A CANNOT set reaction_baseline"               'permission denied.* 4(01|03)$' POST "/posts" "$TA" "{\"author_id\":\"$A_PROF\",\"body\":\"x\",\"reaction_baseline\":{\"fire\":99999}}"
req "A CAN post as self"                           'author_id.* 201$' POST "/posts?select=id,author_id" "$TA" "{\"author_id\":\"$A_PROF\",\"body\":\"my own post\"}"
A_POST=$(psql -c "select id from posts where author_id='$A_PROF' and body='my own post' limit 1")
req "A CANNOT edit B's post (0 rows)"              '^\[\] 200$' PATCH "/posts?id=eq.rls-b-post" "$TA" '{"body":"hacked"}'
req "A CANNOT delete B's post (0 rows)"            '^\[\] 200$' DELETE "/posts?id=eq.rls-b-post" "$TA"
req "A can delete own post"                        'my own post.* 200$' DELETE "/posts?id=eq.$A_POST" "$TA"

echo "== reactions / follows"
req "A CANNOT react as B"                          'row-level security.* 403$' POST "/reactions" "$TA" "{\"post_id\":\"p1\",\"profile_id\":\"$B_PROF\",\"kind\":\"fire\"}"
req "A can react as self"                          'fire.* 201$' POST "/reactions" "$TA" "{\"post_id\":\"p1\",\"profile_id\":\"$A_PROF\",\"kind\":\"fire\"}"
req "A CANNOT follow as B"                         'row-level security.* 403$' POST "/follows" "$TA" "{\"follower_id\":\"$B_PROF\",\"followee_id\":\"$DEMO_PROF\"}"
req "anon CANNOT follow"                           'permission denied.* 4(01|03)$' POST "/follows" "" "{\"follower_id\":\"$A_PROF\",\"followee_id\":\"$DEMO_PROF\"}"

echo "== profiles"
req "A CANNOT mark self verified"                  'permission denied.* 4(01|03)$' PATCH "/profiles?id=eq.$A_PROF" "$TA" '{"verified":true}'
req "A CANNOT inflate follower_baseline"           'permission denied.* 4(01|03)$' PATCH "/profiles?id=eq.$A_PROF" "$TA" '{"follower_baseline":1000000}'
req "A CANNOT edit B's profile (0 rows)"           '^\[\] 200$' PATCH "/profiles?id=eq.$B_PROF" "$TA" '{"name":"hacked"}'
req "A CANNOT edit a demo creator (0 rows)"        '^\[\] 200$' PATCH "/profiles?id=eq.$DEMO_PROF" "$TA" '{"name":"hacked"}'
req "A CANNOT create a profile for B"              'row-level security.* 403$' POST "/profiles" "$TA" "{\"handle\":\"evil\",\"name\":\"x\",\"user_id\":\"$B_ID\"}"

echo "== users / transactions"
req "A CANNOT edit B's user row (0 rows)"          '^\[\] 200$' PATCH "/users?id=eq.$B_ID&select=id" "$TA" '{"display_name":"hacked"}'
req "A CANNOT change own email"                    'permission denied.* 4(01|03)$' PATCH "/users?id=eq.$A_ID" "$TA" '{"email":"x@y.z"}'
req "A CANNOT change own wallet_address"           'permission denied.* 4(01|03)$' PATCH "/users?id=eq.$A_ID" "$TA" '{"wallet_address":"0xdead"}'
req "A CAN change own display_name"                'display_name.* 200$' PATCH "/users?id=eq.$A_ID&select=id,display_name" "$TA" '{"display_name":"RLS Check"}'
req "anon CANNOT create users"                     'permission denied.* 4(01|03)$' POST "/users" "" '{"email":"a@b.c","wallet_address":"0x1"}'
req "authenticated CANNOT create users"            'permission denied.* 4(01|03)$' POST "/users" "$TA" '{"email":"a@b.c","wallet_address":"0x1"}'
req "A CANNOT record a payment as B"               'row-level security.* 403$' POST "/transactions" "$TA" "{\"from_user_id\":\"$B_ID\",\"to_user_id\":\"$A_ID\",\"from_address\":\"x\",\"to_address\":\"y\",\"amount\":\"1\",\"token_contract\":\"c\",\"token_symbol\":\"USDC\",\"chain_id\":8453}"
req "A CANNOT edit B's transaction (0 rows)"       '^\[\] 200$' PATCH "/transactions?from_user_id=eq.$B_ID" "$TA" '{"status":"confirmed"}'

# cleanup test data (and put the test user's display name back)
psql -c "update users set display_name = nullif('${A_NAME//\'/\'\'}','') where id='$A_ID'" >/dev/null
psql -c "delete from reactions where profile_id in ('$A_PROF','$B_PROF'); delete from bookmarks where profile_id='$B_PROF'; delete from posts where id in ('rls-b-post') or body in ('my own post','impersonation','x'); delete from transactions where from_user_id='$B_ID'; delete from profiles where user_id='$B_ID'; delete from users where id='$B_ID'; delete from profiles where handle='evil'" >/dev/null
echo; echo "passed=$pass failed=$fail"
