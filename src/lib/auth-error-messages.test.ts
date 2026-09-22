import test from 'node:test';
import assert from 'node:assert/strict';

import { describeAuthError } from './auth-error-messages';

test('duplicate email errors explain the likely cause in plain language', () => {
  const message = describeAuthError('email already exists', 'sign-up');
  assert.match(message, /already created|another account|different account/i);
});

test('invalid OTP messages are readable and actionable', () => {
  const message = describeAuthError('verification code is invalid or expired', 'sign-up');
  assert.match(message, /expired|incorrect|try again|request a new code/i);
});

test('onboarding duplicate chama membership errors explain the real issue', () => {
  const message = describeAuthError('You are already a member of a chama.', 'onboarding');
  assert.match(message, /already.*member|another chama|join only one/i);
});
