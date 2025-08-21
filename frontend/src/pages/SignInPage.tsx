import React from 'react'
import { Container } from '@mui/material'
import { SignInForm } from '../components/auth/SignInForm'

export const SignInPage: React.FC = () => {
  return (
    <Container>
      <SignInForm />
    </Container>
  )
}