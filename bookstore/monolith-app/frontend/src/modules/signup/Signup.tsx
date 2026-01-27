import React from "react";
import { Redirect } from 'react-router';
import { FormGroup, FormControl, ControlLabel, Button, Glyphicon, HelpBlock } from "react-bootstrap";
import authService from "../../services/authService";
import "./signup.css";
import "./home.css";

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

interface SignupProps {
  isAuthenticated: boolean;
  userHasAuthenticated: (authenticated: boolean) => void;
}

interface SignupState {
  loading: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  emailValid: "success" | "error" | "warning" | undefined;
  passwordValid: "success" | "error" | "warning" | undefined;
  confirmPasswordValid: "success" | "error" | "warning" | undefined;
  redirect: boolean;
  errorMessage: string;
}

export default class Signup extends React.Component<SignupProps, SignupState> {
  constructor(props: SignupProps) {
    super(props);

    this.state = {
      loading: false,
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      emailValid: undefined,
      passwordValid: undefined,
      confirmPasswordValid: undefined,
      redirect: false,
      errorMessage: ""
    };
  }

  onEmailChange = (event: React.FormEvent<FormControl>) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      email: target.value,
      emailValid: emailRegex.test(target.value.toLowerCase()) ? 'success' : 'error'
    });
  }

  onPasswordChange = (event: React.FormEvent<FormControl>) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      password: target.value,
      passwordValid: target.value.length < 6 ? 'error' : 'success'
    });
  }

  onConfirmPasswordChange = (event: React.FormEvent<FormControl>) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      confirmPassword: target.value,
      confirmPasswordValid: target.value !== this.state.password ? 'error' : 'success'
    });
  }

  onNameChange = (event: React.FormEvent<FormControl>) => {
    const target = event.target as HTMLInputElement;
    this.setState({
      name: target.value
    });
  }

  onSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.setState({ loading: true, errorMessage: "" });
  
    try {
      // 调用后端注册API
      await authService.register({
        email: this.state.email,
        password: this.state.password,
        name: this.state.name || undefined
      });
      
      // 注册成功，更新认证状态
      this.props.userHasAuthenticated(true);
      
      // 跳转到首页
      this.setState({ redirect: true, loading: false });
    } catch (e: any) {
      const errorMessage = e.message || 'Registration failed. Please try again.';
      this.setState({ 
        errorMessage: errorMessage,
        loading: false 
      });
    }
  }

  render() {
    if (this.state.redirect) return <Redirect to='/' />

    return (
      <div className="Signup">
        <form onSubmit={this.onSignup}>
          {this.state.errorMessage && (
            <div className="alert alert-danger" role="alert">
              {this.state.errorMessage}
            </div>
          )}
          
          <FormGroup controlId="email" validationState={this.state.emailValid}>
            <ControlLabel>Email</ControlLabel>
            <FormControl
              name="email"
              type="email"
              bsSize="large"
              value={this.state.email}
              onChange={this.onEmailChange} />
            <FormControl.Feedback />
          </FormGroup>
          
          <FormGroup controlId="name">
            <ControlLabel>Name (Optional)</ControlLabel>
            <FormControl
              name="name"
              type="text"
              bsSize="large"
              value={this.state.name}
              onChange={this.onNameChange} />
          </FormGroup>
          
          <FormGroup controlId="password" validationState={this.state.passwordValid}>
            <ControlLabel>Password</ControlLabel>
            <FormControl
              name="password"
              type="password"
              bsSize="large"
              value={this.state.password}
              onChange={this.onPasswordChange} />
            <FormControl.Feedback />
            <HelpBlock>Must be at least 6 characters</HelpBlock>
          </FormGroup>
          
          <FormGroup controlId="confirmPassword" validationState={this.state.confirmPasswordValid}>
            <ControlLabel>Confirm Password</ControlLabel>
            <FormControl
              name="confirmPassword"
              type="password"
              bsSize="large"
              value={this.state.confirmPassword}
              onChange={this.onConfirmPasswordChange} />
            <FormControl.Feedback />
          </FormGroup>
          
          <Button
            block
            bsSize="large"
            type="submit"
            disabled={this.state.passwordValid !== 'success' || this.state.confirmPasswordValid !== 'success' || this.state.emailValid !== 'success' || this.state.loading}>
            {this.state.loading && <Glyphicon glyph="refresh" className="spinning" />}
            {this.state.loading ? ' Signing up...' : ' Sign up'}
          </Button>
        </form>
      </div>
    );
  }
}