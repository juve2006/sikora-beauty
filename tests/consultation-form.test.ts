import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendConsultation } from '@/components/shared/consultation/consultation-form';
import { requestConsultation } from '@/lib/actions/consultation.actions';

// The server action as the browser sees it: a call that may never reach the server.
vi.mock('@/lib/actions/consultation.actions', () => ({
  requestConsultation: vi.fn(),
}));

const fields = new FormData();
fields.append('name', 'Олена');
fields.append('phone', '0671234567');
fields.append('locale', 'uk');
const idle = { status: 'idle' } as const;

describe('the consultation form’s action', () => {
  afterEach(() => vi.clearAllMocks());

  it('answers «failed» when the request never reaches the server', async () => {
    vi.mocked(requestConsultation).mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    );
    expect(await sendConsultation(idle, () => fields)).toEqual({
      status: 'failed',
    });
  });

  it('shows a wrong field without calling the server', async () => {
    const wrong = new FormData();
    wrong.append('name', '');
    wrong.append('phone', '123');
    expect(await sendConsultation(idle, () => wrong)).toEqual({
      status: 'invalid',
      errors: { name: ['nameRequired'], phone: ['phoneInvalid'] },
    });
    expect(requestConsultation).not.toHaveBeenCalled();
  });
});
