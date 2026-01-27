import React, { useState, useEffect } from 'react';
import { Header, Form, Segment, Message } from 'semantic-ui-react';
import { PhotoList, ImageUpload } from "./PhotoList";
import { albumAPI } from '../services/apiService';

export const AlbumDetails = ({ id }) => {
	console.log('=== AlbumDetails 组件被渲染了！id =', id);
	
	const [album, setAlbum] = useState({ name: '加载中...', id: id });
	const [photos, setPhotos] = useState([]);
	const [hasMorePhotos, setHasMorePhotos] = useState(true);
	const [fetchingPhotos, setFetchingPhotos] = useState(false);
	const [offset, setOffset] = useState(0);
	const [error, setError] = useState('');

	useEffect(() => {
		console.log('=== useEffect 被触发了！开始加载数据...');
		loadAlbumInfo();
		fetchPhotos(0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const loadAlbumInfo = async () => {
		console.log('=== 开始获取相册信息，id =', id);
		try {
			const response = await albumAPI.get(id);
			console.log('=== 相册信息获取成功：', response.data);
			setAlbum(response.data);
		} catch (err) {
			console.error('=== 获取相册信息失败：', err);
			setError(err.response?.data?.error || err.message || '获取相册信息失败');
		}
	};

	const fetchPhotos = async (currentOffset) => {
		const FETCH_LIMIT = 20;
		setFetchingPhotos(true);
		console.log('=== 开始获取照片列表，id =', id, 'offset =', currentOffset);

		try {
			const response = await albumAPI.listPhotos(id, FETCH_LIMIT, currentOffset);
			console.log('=== 照片列表API响应：', response);
			const newPhotos = response.data || [];
			console.log('=== 解析出的照片数量：', newPhotos.length, '照片内容：', newPhotos);
			
			if (currentOffset === 0) {
				setPhotos(newPhotos);
			} else {
				setPhotos(p => [...p, ...newPhotos]);
			}
			
			setHasMorePhotos(response.hasMore || false);
			setOffset(currentOffset + newPhotos.length);
		} catch (err) {
			console.error('=== 获取照片列表失败：', err);
			setError(err.response?.data?.error || err.message || '获取照片列表失败');
		} finally {
			setFetchingPhotos(false);
		}
	};

	const fetchNextPhotos = () => {
		fetchPhotos(offset);
	};

	const handlePhotoUploaded = (newPhoto) => {
		// 上传成功后，将新照片添加到列表开头
		setPhotos(p => [newPhoto, ...p]);
	};

	console.log('=== 准备渲染，当前状态：', { 
		albumName: album.name, 
		photosCount: photos.length, 
		error, 
		id 
	});

	return (
		<Segment>
			<Header as='h3'>{album.name}</Header>
			<p style={{color: 'blue'}}>调试信息：相册ID = {id}, 照片数量 = {photos.length}</p>
			{error && <Message error content={error} />}
			<ImageUpload 
				albumId={id} 
				onUploadSuccess={handlePhotoUploaded}
			/>
			<PhotoList photos={photos} />
			{
				hasMorePhotos &&
				<Form.Button
					onClick={fetchNextPhotos}
					icon='refresh'
					disabled={fetchingPhotos}
					content={fetchingPhotos ? '加载中...' : '加载更多照片'}
				/>
			}
		</Segment>
	);
};
