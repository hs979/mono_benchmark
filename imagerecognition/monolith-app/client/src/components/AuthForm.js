/**
 * 认证表单组件
 * 替换@aws-amplify/ui-react的withAuthenticator
 */

import React, { useState } from 'react';
import { Button, Form, Grid, Header, Message, Segment, Tab } from 'semantic-ui-react';
import { signIn, signUp } from '../services/authService';

const LoginForm = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(username, password);
            onLoginSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form size='large' onSubmit={handleSubmit} error={!!error}>
            <Segment stacked>
                <Form.Input
                    fluid
                    icon='user'
                    iconPosition='left'
                    placeholder='用户名'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <Form.Input
                    fluid
                    icon='lock'
                    iconPosition='left'
                    placeholder='密码'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Message error content={error} />
                <Button color='blue' fluid size='large' loading={loading} disabled={loading}>
                    登录
                </Button>
            </Segment>
        </Form>
    );
};

const RegisterForm = ({ onRegisterSuccess }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            setError('密码长度至少6个字符');
            return;
        }

        setLoading(true);

        try {
            await signUp(username, email, password);
            onRegisterSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form size='large' onSubmit={handleSubmit} error={!!error}>
            <Segment stacked>
                <Form.Input
                    fluid
                    icon='user'
                    iconPosition='left'
                    placeholder='用户名（3-30个字符）'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <Form.Input
                    fluid
                    icon='mail'
                    iconPosition='left'
                    placeholder='邮箱'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Form.Input
                    fluid
                    icon='lock'
                    iconPosition='left'
                    placeholder='密码（至少6个字符）'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Form.Input
                    fluid
                    icon='lock'
                    iconPosition='left'
                    placeholder='确认密码'
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <Message error content={error} />
                <Button color='green' fluid size='large' loading={loading} disabled={loading}>
                    注册
                </Button>
            </Segment>
        </Form>
    );
};

const AuthForm = ({ onAuthSuccess }) => {
    const panes = [
        {
            menuItem: '登录',
            render: () => (
                <Tab.Pane>
                    <LoginForm onLoginSuccess={onAuthSuccess} />
                </Tab.Pane>
            ),
        },
        {
            menuItem: '注册',
            render: () => (
                <Tab.Pane>
                    <RegisterForm onRegisterSuccess={onAuthSuccess} />
                </Tab.Pane>
            ),
        },
    ];

    return (
        <Grid textAlign='center' style={{ height: '100vh' }} verticalAlign='middle'>
            <Grid.Column style={{ maxWidth: 450 }}>
                <Header as='h2' color='blue' textAlign='center'>
                    图片分享应用
                </Header>
                <Tab panes={panes} />
            </Grid.Column>
        </Grid>
    );
};

export default AuthForm;

