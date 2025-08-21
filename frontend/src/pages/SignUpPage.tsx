import React from 'react';
import { SignUpForm } from '../components/auth/SignUpForm';
import { Container } from '@mui/material';

export const SignUpPage: React.FC = () => {
  return (
    <Container>
      <SignUpForm />
    </Container>
  );
};