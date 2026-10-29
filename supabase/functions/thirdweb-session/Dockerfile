# Runs the Edge Function as a plain Deno service (local development, or any container host).
# On hosted Supabase the same index.ts deploys unchanged with `supabase functions deploy thirdweb-session`.
FROM denoland/deno:alpine-2.1.4
WORKDIR /app
COPY index.ts .
RUN deno cache index.ts
USER deno
EXPOSE 8000
CMD ["run", "--allow-net", "--allow-env", "index.ts"]
