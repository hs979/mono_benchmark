import React, { useState, useEffect } from 'react';
import { Header, Input, List, Segment, Message } from 'semantic-ui-react';
import { NavLink } from 'react-router-dom';
import { albumAPI } from '../services/apiService';
import { makeComparator } from "../utils";

export const NewAlbum = () => {
	const [name, setName] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!name.trim()) {
			setError('相册名称不能为空');
			return;
		}

		setLoading(true);
		setError('');

		try {
			await albumAPI.create(name);
			setName('');
			// 触发刷新列表
			window.dispatchEvent(new Event('albumCreated'));
		} catch (err) {
			setError(err.response?.data?.error || err.message || '创建相册失败');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Segment>
			<Header as='h3'>添加新相册</Header>
			{error && <Message error content={error} />}
			<Input 
				type='text'
				placeholder='新相册名称'
				icon='plus'
				iconPosition='left'
				action={{ 
					content: '创建', 
					onClick: handleSubmit,
					loading: loading,
					disabled: loading
				}}
				name='name'
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
			/>
		</Segment>
	);
};

export const AlbumList = () => {
	const [albums, setAlbums] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const fetchAlbums = async () => {
		try {
			setLoading(true);
			const response = await albumAPI.list(999);
			setAlbums(response.data || []);
			setError('');
		} catch (err) {
			setError(err.response?.data?.error || err.message || '获取相册列表失败');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAlbums();

		// 监听相册创建事件，自动刷新列表
		const handleAlbumCreated = () => {
			fetchAlbums();
		};

		window.addEventListener('albumCreated', handleAlbumCreated);

		return () => {
			window.removeEventListener('albumCreated', handleAlbumCreated);
		};
	}, []);

	const albumItems = () => {
		return albums
			.sort(makeComparator('name'))
			.map(album => (
				<List.Item key={album.id}>
					<NavLink to={`/albums/${album.id}`}>{album.name}</NavLink>
				</List.Item>
			));
	};

	return (
		<Segment>
			<Header as='h3'>我的相册</Header>
			{error && <Message error content={error} />}
			{loading ? (
				<Message>加载中...</Message>
			) : albums.length === 0 ? (
				<Message>还没有相册，请先创建一个</Message>
			) : (
				<List divided relaxed>
					{albumItems()}
				</List>
			)}
		</Segment>
	);
};
