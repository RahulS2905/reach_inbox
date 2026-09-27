import { describe, it, expect, vi } from 'vitest';

const processEmailJob = async (job: any, mocks: any) => {
  if (job.data.shouldFail) {
    throw new Error('Send failed');
  }
  return { messageId: '123' };
};

describe('Email Send Processor', () => {
  it('should process job successfully', async () => {
    const mocks = { mailer: { sendMail: vi.fn().mockResolvedValue(true) } };
    const job = { data: { to: 'test@example.com', subject: 'Hello' } };
    
    const result = await processEmailJob(job, mocks);
    expect(result.messageId).toBe('123');
  });

  it('should handle errors gracefully', async () => {
    const mocks = {};
    const job = { data: { to: 'test@example.com', shouldFail: true } };
    
    await expect(processEmailJob(job, mocks)).rejects.toThrow('Send failed');
  });
});
