/**
 * Todo应用主组件
 * 
 */

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
  const [isLogin, setIsLogin] = useState(true); // true为登录模式，false为注册模式

  // 表单输入状态
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // 从localStorage恢复登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUsername(savedUsername);
    }
  }, []);

  // 当token变化时，获取待办事项列表
  useEffect(() => {
    if (token && username) {
      getAllTodos();
    }
  }, [token, username]);

  // 配置axios拦截器，处理认证错误
  axios.interceptors.response.use(
    response => {
      return response;
    },
    error => {
      if (error.response && error.response.status === 401) {
        // 认证失败，清除登录状态
        handleLogout();
        updateAlert({
          alert: '登录已过期，请重新登录',
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

  /**
   * 用户登录
   */
  const handleLogin = async (event) => {
    event.preventDefault();

    if (!formUsername || !formPassword) {
      updateAlert({
        alert: '请输入用户名和密码',
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
        
        // 保存到state和localStorage
        setToken(token);
        setUsername(username);
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);

        // 清空表单
        setFormUsername('');
        setFormPassword('');

        updateAlert({
          alert: '登录成功！',
          style: 'success',
          visible: true,
          dismissable: true
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      updateAlert({
        alert: error.response?.data?.message || '登录失败，请检查用户名和密码',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  };

  /**
   * 用户注册
   */
  const handleRegister = async (event) => {
    event.preventDefault();

    if (!formUsername || !formPassword) {
      updateAlert({
        alert: '请输入用户名和密码',
        style: 'warning',
        visible: true,
        dismissable: true
      });
      return;
    }

    if (formPassword.length < 6) {
      updateAlert({
        alert: '密码长度至少为6个字符',
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
        
        // 保存到state和localStorage
        setToken(token);
        setUsername(username);
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);

        // 清空表单
        setFormUsername('');
        setFormPassword('');
        setFormEmail('');

        updateAlert({
          alert: '注册成功！',
          style: 'success',
          visible: true,
          dismissable: true
        });
      }
    } catch (error) {
      console.error('注册失败:', error);
      updateAlert({
        alert: error.response?.data?.message || '注册失败，请稍后重试',
        style: 'danger',
        visible: true,
        dismissable: true
      });
    }
  };

  /**
   * 用户登出
   */
  const handleLogout = () => {
    setToken('');
    setUsername('');
    setToDos([]);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  /**
   * 获取所有待办事项
   */
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
      console.error('获取待办事项失败:', error);
    }
  };

  /**
   * 添加待办事项
   */
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

