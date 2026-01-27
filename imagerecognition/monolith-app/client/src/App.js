import React, { useState, useEffect } from 'react';
import { Grid, Header, Menu, Button } from 'semantic-ui-react';
import { BrowserRouter as Router, NavLink, Route, Routes, useParams } from 'react-router-dom';

import { AlbumList, NewAlbum } from './components/Album';
import { AlbumDetails } from "./components/AlbumDetail";
import AuthForm from './components/AuthForm';
import { isAuthenticated, signOut, currentAuthenticatedUser } from './services/authService';

function App() {
	const [authenticated, setAuthenticated] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);

	useEffect(() => {
		checkAuthStatus();
	}, []);

	const checkAuthStatus = () => {
		const isAuth = isAuthenticated();
		setAuthenticated(isAuth);
		
		if (isAuth) {
			try {
				const user = currentAuthenticatedUser();
				setCurrentUser(user);
			} catch (error) {
				console.error('获取用户信息失败:', error);
				setAuthenticated(false);
			}
		}
	};

	const handleAuthSuccess = () => {
		checkAuthStatus();
	};

	const handleSignOut = async () => {
		await signOut();
		setAuthenticated(false);
		setCurrentUser(null);
	};

	if (!authenticated) {
		return <AuthForm onAuthSuccess={handleAuthSuccess} />;
	}

	return (
		<Router>
			<Menu inverted attached>
				<Menu.Item name='home'>
					<NavLink to='/' style={{ textDecoration: 'none' }}>
						<Header color="yellow">相册</Header>
					</NavLink>
				</Menu.Item>
				<Menu.Menu position='right'>
					<Menu.Item>
						<span style={{ color: 'white', marginRight: '10px' }}>
							欢迎, {currentUser?.username}
						</span>
					</Menu.Item>
					<Menu.Item>
						<Button color='red' onClick={handleSignOut}>
							登出
						</Button>
					</Menu.Item>
				</Menu.Menu>
			</Menu>

			<Grid padded>
				<Grid.Column>
					<Routes>
						<Route path="/" element={
							<>
								<NewAlbum />
								<AlbumList />
							</>
						} />
						<Route path="/albums/:albumId" element={<AlbumDetailsWrapper />} />
					</Routes>
				</Grid.Column>
			</Grid>
		</Router>
	);
}

// 辅助组件，用于传递useParams的参数
function AlbumDetailsWrapper() {
	const { albumId } = useParams();
	return <AlbumDetails id={albumId} />;
}

export default App;
