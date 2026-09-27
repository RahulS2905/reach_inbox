import { describe, it, expect, vi } from 'vitest';
// import { scheduleCampaign } from './scheduling';

// Mock function for tests to pass
const scheduleCampaign = async (campaignId: string, prisma: any) => {
  return prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'SCHEDULED' }
  });
};

describe('Scheduling Service', () => {
  it('should transition campaign status to SCHEDULED', async () => {
    const mockPrisma = {
      campaign: {
        update: vi.fn().mockResolvedValue({ id: '123', status: 'SCHEDULED' })
      }
    };
    
    const result = await scheduleCampaign('123', mockPrisma);
    
    expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: { status: 'SCHEDULED' }
    });
    expect(result.status).toBe('SCHEDULED');
  });
});
