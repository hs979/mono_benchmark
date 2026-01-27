import React, { useState } from 'react';
import { Card, Label, Divider, Form, Message } from 'semantic-ui-react';
import { v4 as uuid } from 'uuid';
import { photoAPI, getThumbnailUrl } from '../services/apiService';

export const ImageUpload = ({ albumId, onUploadSuccess }) => {
	const [uploading, setUploading] = useState(false);
	const [uploadStatuses, setUploadStatuses] = useState({});
	const [error, setError] = useState('');

	const uploadFile = async (file) => {
		const fileId = uuid();
		
		try {
			// 更新上传状态
			setUploadStatuses(prev => ({
				...prev,
				[fileId]: {
					filename: file.name,
					status: 'uploading'
				}
			}));

			const response = await photoAPI.upload(albumId, file);

			if (response.success) {
				// 上传成功
				setUploadStatuses(prev => ({
					...prev,
					[fileId]: {
						filename: file.name,
						status: 'success'
					}
				}));

				// 通知父组件
				if (onUploadSuccess) {
					onUploadSuccess(response.data);
				}

				// 3秒后清除成功消息
				setTimeout(() => {
					setUploadStatuses(prev => {
						const newStatuses = { ...prev };
						delete newStatuses[fileId];
						return newStatuses;
					});
				}, 3000);
			}
		} catch (err) {
			console.error('上传失败:', err);
			setUploadStatuses(prev => ({
				...prev,
				[fileId]: {
					filename: file.name,
					status: 'error',
					error: err.response?.data?.error || err.message || '上传失败'
				}
			}));
		}
	};

	const onFileSelectionChange = async (e) => {
		setError('');
		setUploading(true);
		setUploadStatuses({});

		const files = Array.from(e.target.files);
		
		if (files.length === 0) {
			setUploading(false);
			return;
		}

		try {
			await Promise.all(files.map(f => uploadFile(f)));
		} catch (err) {
			setError('部分文件上传失败');
		} finally {
			setUploading(false);
			// 清空文件输入
			e.target.value = '';
		}
	};

	const UploadStatuses = () => {
		const statuses = Object.values(uploadStatuses);
		if (statuses.length === 0) return null;

		return (
			<div style={{ marginTop: '10px' }}>
				{statuses.map((status, index) => (
					<Message
						key={index}
						positive={status.status === 'success'}
						warning={status.status === 'uploading'}
						negative={status.status === 'error'}
					>
						<b>{status.filename}</b>
						{status.status === 'uploading' && ' - 上传中...'}
						{status.status === 'success' && ' - 上传成功！'}
						{status.status === 'error' && ` - ${status.error}`}
					</Message>
				))}
			</div>
		);
	};

	return (
		<div>
			<Form.Button
				onClick={() => document.getElementById('add-image-file-input').click()}
				disabled={uploading}
				icon='file image outline'
				content={uploading ? '上传中...' : '添加图片'}
			/>
			<input
				id='add-image-file-input'
				type="file"
				accept='image/*'
				multiple
				onChange={onFileSelectionChange}
				style={{ display: 'none' }}
			/>
			{error && <Message error content={error} />}
			<UploadStatuses />
		</div>
	);
};

export const PhotoList = React.memo(({ photos }) => {
	const PhotoItems = ({ photos }) => {
		const photoItem = (photo) => {
			if (photo.ProcessingStatus === "SUCCEEDED") {
				const DetectedLabels = () => {
					if (photo.objectDetected && photo.objectDetected.length > 0) {
						return photo.objectDetected.map((tag, index) => (
							<Label basic color='orange' key={index}>
								{tag}
							</Label>
						));
					} else {
						return <span>无</span>;
					}
				};

				const GeoLocation = () => {
					if (photo.geoLocation) {
						const geo = photo.geoLocation;
						return (
							<p>
								<strong>地理位置：</strong>&nbsp;
								{geo.Latitude.D}°{Math.round(geo.Latitude.M)}'{Math.round(geo.Latitude.S)}"{geo.Latitude.Direction} &nbsp;
								{geo.Longtitude.D}°{Math.round(geo.Longtitude.M)}'{Math.round(geo.Longtitude.S)}"{geo.Longtitude.Direction}
							</p>
						);
					} else {
						return null;
					}
				};

				// 获取缩略图URL
				const thumbnailUrl = getThumbnailUrl(photo.thumbnail.key);

				return (
					<Card key={photo.id}>
						<Card.Content textAlign="center">
							<img
								src={thumbnailUrl}
								alt={photo.id}
								style={{ maxWidth: '100%', height: 'auto' }}
								onError={(e) => {
									console.error('图片加载失败:', thumbnailUrl);
									e.target.src = '/placeholder.png'; // 可选：设置占位图
								}}
							/>
						</Card.Content>
						<Card.Content>
							<Card.Meta>
								<span className='date'>
									上传时间: {new Date(photo.uploadTime).toLocaleString('zh-CN')}
								</span>
							</Card.Meta>
							<Card.Description>
								<p><b>检测到的标签：</b></p>
								<DetectedLabels />
								<p><b>图片尺寸：</b>{photo.fullsize.width} x {photo.fullsize.height}</p>
								<GeoLocation />
								{(photo.exifMake || photo.exifModel) && (
									<p><strong>拍摄设备：</strong>{photo.exifMake} {photo.exifModel}</p>
								)}
							</Card.Description>
						</Card.Content>
					</Card>
				);
			} else if (photo.ProcessingStatus === "RUNNING" || photo.ProcessingStatus === "PENDING") {
				return (
					<Card key={photo.id}>
						<Card.Content textAlign="center">
							<Message>处理中...</Message>
						</Card.Content>
					</Card>
				);
			}
			return null;
		};

		return <Card.Group>{photos.map(photoItem)}</Card.Group>;
	};

	return (
		<div>
			<Divider hidden />
			<PhotoItems photos={photos} />
		</div>
	);
});
