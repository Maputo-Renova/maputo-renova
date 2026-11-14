export async function register() {
  // Em ambientes com proxy de saída (HTTPS_PROXY), o fetch do Node não o usa
  // por omissão — o browser e o curl usam. Sem proxy definido, nada muda.
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
}
