/** URL fragments stay on the client; restoring them still uses each tool's validator. */
export function toolResultUrl(slug: string, input: unknown) {
  const bytes=new TextEncoder().encode(JSON.stringify({toolInput:input}));
  const encoded=btoa(Array.from(bytes,byte => String.fromCharCode(byte)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return `https://operatornest.com/tools/${slug}#state=${encoded}`;
}
