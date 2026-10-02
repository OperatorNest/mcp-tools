export function scrub(message:any) {
  if (message?.error) {
    const {code,data}=message.error;
    // Negotiation metadata lets modern clients choose a compatible revision.
    // Only date-shaped revisions survive; validation details never echo inputs.
    const revision=(value:unknown) => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    const negotiation=code===-32022 && Array.isArray(data?.supported) ? {data:{supported:data.supported.filter(revision),requested:revision(data.requested) ? data.requested : 'unknown'}} : {};
    message.error={code,message:'MCP request failed. Check the method, protocol and tool schema.',...negotiation};
  }
  if (message?.result?.isError) {
    // Keep the SDK's modern resultType and server identity envelope.
    message.result.content=[{type:'text',text:'Invalid input. Check the tool schema and retry.'}];
    delete message.result.structuredContent;
  }
  return message;
}
