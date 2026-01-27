import React from "react";
import { Redirect } from 'react-router';
import { FormGroup, FormControl, ControlLabel, Button, Glyphicon } from "react-bootstrap";
import authService from "../../services/authService";
import "./login.css";

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

interface LoginProps {
  isAuthenticated: boolean;
  userHasAuthenticated: (authenticated: boolean) => void;
}

interface LoginState {
  loading: boolean;
  redirect: boolean;
  email: string;
  password: string;
  emailValid: "success" | "error" | "warning" | undefined;
  passwordValid: "success" | "error" | "warning" | undefined;
  errorMessage: string;
}

export default class Login extends React.Component<LoginProps, LoginState> {
  constructor(props: LoginProps) {
    super(props);

    this.state = {
      loading: false,
      redirect: false,
      email: "",
      password: "",
      emailValid: undefined,
      passwordValid: undefined,
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

  onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.setState({ loading: true, errorMessage: "" });
  
    try {
      // 调用后端登录API
      await authService.login({
        email: this.state.email,
        password: this.state.password
      });
      
      // 登录成功，更新认证状态
      this.props.userHasAuthenticated(true);
      
      // 跳转到首页
      this.setState({ redirect: true, loading: false })
    } catch (e: any) {
      const errorMessage = e.message || 'Login failed. Please check your credentials.';
      this.setState({ 
        errorMessage: errorMessage,
        loading: false 
      });
    }
  }

  render() {
    if (this.state.redirect) return <Redirect to='/' />

    return (
      <div className="Login">
        <form onSubmit={this.onLogin}>
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
          <FormGroup controlId="password" validationState={this.state.passwordValid}>
            <ControlLabel>Password</ControlLabel>
            <FormControl
              name="password"
              type="password"
              bsSize="large"
              value={this.state.password}
              onChange={this.onPasswordChange} />
            <FormControl.Feedback />
          </FormGroup>
          <Button
            block
            bsSize="large"
            type="submit"
            disabled={this.state.passwordValid !== 'success' || this.state.emailValid !== 'success' || this.state.loading}>
            {this.state.loading && <Glyphicon glyph="refresh" className="spinning" />}
            {this.state.loading ? ' Logging in...' : ' Log in'}
          </Button>
        </form>
      </div>
    );
  }
}