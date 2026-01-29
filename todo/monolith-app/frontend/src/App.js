import React, { useState, useEffect } from 'react';
import { Container, Jumbotron, Row, Col, Alert, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import axios from 'axios';
import ToDo from './ToDo'

import './App.css';
import logo from './aws.png';

import config from './config';

function App() {
  const [alert, setAlert] = useState();
  const [alertStyle, setAlertStyle] = useState('info');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertDismissable, setAlertDismissable] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [toDos, setToDos] = useState([]);
  const [isLogin, setIsLogin] = useState(true);

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUsername(savedUsername);
    }
  }, []);

  useEffect(() => {
    if (token && username) {
      getAllTodos();
    }
  }, [token, username]);

  axios.interceptors.response.use(
    response => {
      return response;
    },
    error => {
      if (error.response && error.response.status === 401) {
        handleLogout();
        updateAlert({
          alert: 'Login expired, please login again',
          style: 'warning',
          visible: true,
          dismissable: true
        });
      }
      return Promise.reject(error);
    }
  );

  function onDismiss() {
    setAlertVisible(false);
  }

  function updateAlert({ alert, style, visible, dismissable }) {
    setAlert(alert ? alert : '');
    setAlertStyle(style ? style : 'info');
    setAlertVisible(visible);
    setAlertDismissable(dismissable ? dismissable : null);
  }

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!formUsername || !formPassword) {
      updateAlert({
        alert: 'Please enter username and password',
        style: 'warning',
        visible: true,
        dismissable: true
      });
      return;
    }

    try {
      const result = await axios.post('http://localhost:8080/auth/login', {
        username: formUsername,
        password: formPassword
      });

      if (result.status === 200) {
        const { token, username } = result.data;
        
        setToken(token);
        setUsername(username);
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);

        setFormUsername('');
        setFormPassword('');

        updateAlert({
          alert: 'Login successful!',
          style: 'success',
          visible: true,
          dismissable: true
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      updateAlert({
        alert: error.response?.data?.message || 'Login failed, please check username and password',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (!formUsername || !formPassword) {
      updateAlert({
        alert: 'Please enter username and password',
        style: 'warning',
        visible: true,
        dismissable: true
      });
      return;
    }

    if (formPassword.length < 6) {
      updateAlert({
        alert: 'Password must be at least 6 characters long',
        style: 'warning',
        visible: true,
        dismissable: true
      });
      return;
    }

    try {
      const result = await axios.post('http://localhost:8080/auth/register', {
        username: formUsername,
        password: formPassword,
        email: formEmail
      });

      if (result.status === 201) {
        const { token, username } = result.data;
        
        setToken(token);
        setUsername(username);
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);

        setFormUsername('');
        setFormPassword('');
        setFormEmail('');

        updateAlert({
          alert: 'Registration successful!',
          style: 'success',
          visible: true,
          dismissable: true
        });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      updateAlert({
        alert: error.response?.data?.message || 'Registration failed, please try again later',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
    setToDos([]);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const getAllTodos = async () => {
    try {
      const result = await axios({
        url: `${config.api_base_url}/item/`,
        headers: {
          Authorization: token
        }
      });

      if (result && result.status === 200) {
        setToDos(result.data.Items || []);
      }
    } catch (error) {
      console.error('Failed to fetch todo items:', error);
    }
  };

  const addToDo = async (event) => {
    const newToDoInput = document.getElementById('newToDo');
    const item = newToDoInput.value;
    
    if (!item || item === '') return;

    const newToDo = {
      "item": item,
      "completed": false
    };

    try {
      const result = await axios({
        method: 'POST',
        url: `${config.api_base_url}/item/`,
        headers: {
          Authorization: token
        },
        data: newToDo
      });

      if (result && result.status === 200) {
        getAllTodos();
        newToDoInput.value = '';
      }
    } catch (error) {
      console.error('添加待办事项失败:', error);
      updateAlert({
        alert: '添加失败，请重试',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  }

  /**
   * 删除待办事项
   */
  const deleteToDo = async (indexToRemove, itemId) => {
    if (indexToRemove === null || itemId === null) return;

    try {
      const result = await axios({
        method: 'DELETE',
        url: `${config.api_base_url}/item/${itemId}`,
        headers: {
          Authorization: token
        }
      });

      if (result && result.status === 200) {
        const newToDos = toDos.filter((item, index) => index !== indexToRemove);
        setToDos(newToDos);
      }
    } catch (error) {
      console.error('删除待办事项失败:', error);
      updateAlert({
        alert: '删除失败，请重试',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  }

  /**
   * 标记待办事项为完成
   */
  const completeToDo = async (itemId) => {
    if (itemId === null) return;

    try {
      const result = await axios({
        method: 'POST',
        url: `${config.api_base_url}/item/${itemId}/done`,
        headers: {
          Authorization: token
        }
      });

      if (result && result.status === 200) {
        getAllTodos();
      }
    } catch (error) {
      console.error('标记完成失败:', error);
      updateAlert({
        alert: '操作失败，请重试',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  }

  return (
    <div className="App">
      <Container>
        <Alert color={alertStyle} isOpen={alertVisible} toggle={alertDismissable ? onDismiss : null}>
          <p dangerouslySetInnerHTML={{ __html: alert }}></p>
        </Alert>
        <Jumbotron>
          <Row>
            <Col md="6" className="logo">
              <h1>Todo应用</h1>
              <p>这是一个传统的单体Web应用。</p>
              <p>使用Node.js + Express作为后端，React作为前端，DynamoDB作为数据库。采用JWT进行用户身份认证。</p>
              <img src={logo} alt="Logo" />
            </Col>
            <Col md="6">
              {token && username ? (
                <div>
                  <div className="user-info">
                    <p>欢迎回来，<strong>{username}</strong>！</p>
                    <Button color="secondary" size="sm" onClick={handleLogout} className="logout-btn">
                      退出登录
                    </Button>
                  </div>
                  <ToDo 
                    updateAlert={updateAlert} 
                    toDos={toDos} 
                    addToDo={addToDo} 
                    deleteToDo={deleteToDo} 
                    completeToDo={completeToDo} 
                  />
                </div>
              ) : (
                <div className="auth-form">
                  <h3>{isLogin ? '登录' : '注册'}</h3>
                  <Form onSubmit={isLogin ? handleLogin : handleRegister}>
                    <FormGroup>
                      <Label for="username">用户名</Label>
                      <Input
                        type="text"
                        name="username"
                        id="username"
                        placeholder="请输入用户名"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        required
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label for="password">密码</Label>
                      <Input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="请输入密码（至少6位）"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        required
                      />
                    </FormGroup>
                    {!isLogin && (
                      <FormGroup>
                        <Label for="email">邮箱（可选）</Label>
                        <Input
                          type="email"
                          name="email"
                          id="email"
                          placeholder="请输入邮箱"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                        />
                      </FormGroup>
                    )}
                    <Button color="primary" type="submit" block>
                      {isLogin ? '登录' : '注册'}
                    </Button>
                  </Form>
                  <div className="auth-toggle">
                    <button onClick={() => setIsLogin(!isLogin)}>
                      {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
                    </button>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Jumbotron>
      </Container>
    </div >
  );
}

export default App;

