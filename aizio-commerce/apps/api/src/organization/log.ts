export function orgLog(fields: {
  msg: string;
  missionId?: string;
  jobId?: string;
  incidentId?: string;
  correlationId?: string;
  requestId?: string;
}): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      msg: fields.msg,
      missionId: fields.missionId,
      jobId: fields.jobId,
      incidentId: fields.incidentId,
      correlationId: fields.correlationId,
      requestId: fields.requestId,
    }),
  );
}
