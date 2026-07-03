import CsrfSession from "../models/CsrfSession.js";

export const create = (data) => CsrfSession.create(data);

export const findBySessionId = (sessionId) =>
  CsrfSession.findOne({ sessionId });

export const deleteBySessionId = (sessionId) =>
  CsrfSession.deleteOne({ sessionId });
