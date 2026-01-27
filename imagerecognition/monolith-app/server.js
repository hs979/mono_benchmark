const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const imageProcessor = require('./services/image-processor');
const database = require('./database');  // 使用新的数据库入口
const { authMiddleware, optionalAuthMiddleware } = require('./middleware/auth');

// 导入路由
const authRoutes = require('./routes/auth');
const albumRoutes = require('./routes/albums');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMBNAIL_DIR = path.join(__dirname, 'uploads', 'thumbnails');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只支持JPG和PNG格式的图片'));
        }
    }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务 - 用于访问上传的图片和缩略图
app.use('/uploads', express.static(UPLOAD_DIR));

// 托管前端静态文件（React构建后的文件）
const CLIENT_BUILD_PATH = path.join(__dirname, 'client', 'build');
if (fs.existsSync(CLIENT_BUILD_PATH)) {
    app.use(express.static(CLIENT_BUILD_PATH));
    console.log('前端静态文件路径:', CLIENT_BUILD_PATH);
}

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);

// API端点：上传并处理图片（需要认证，支持相册）
app.post('/api/photos', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传图片文件' });
        }

        const userId = req.user.id; // 从认证中间件获取
        const albumId = req.body.albumId;
        const photoId = path.parse(req.file.filename).name;
        const filePath = req.file.path;

        // 验证相册ID
        if (!albumId) {
            return res.status(400).json({ error: '请指定相册ID' });
        }

        // 验证相册是否存在且属于当前用户
        const album = await database.getAlbum(albumId);
        if (!album) {
            return res.status(404).json({ error: '相册不存在' });
        }
        if (album.userId !== userId) {
            return res.status(403).json({ error: '无权向此相册上传照片' });
        }

        console.log(`开始处理图片: ${req.file.filename}`);

        // 执行图片处理工作流
        const result = await imageProcessor.processImage({
            photoId: photoId,
            filePath: filePath,
            fileName: req.file.filename,
            userId: userId, // 使用认证过的userId
            albumId: albumId
        });

        // 保存到数据库
        await database.savePhoto(result);

        // 关联照片到相册
        await database.addPhotoToAlbum(albumId, photoId, userId);

        console.log(`图片处理完成: ${photoId}`);

        res.status(201).json({
            success: true,
            message: '图片上传并处理成功',
            data: {
                id: photoId,
                albumId: albumId,
                uploadTime: new Date().toISOString(),
                ProcessingStatus: 'SUCCEEDED',
                fullsize: result.fullsize,
                thumbnail: result.thumbnail,
                objectDetected: result.labels,
                geoLocation: result.geolocation,
                exifMake: result.exif_make,
                exifModel: result.exif_model
            }
        });

    } catch (error) {
        console.error('处理图片时出错:', error);
        res.status(500).json({
            success: false,
            error: error.message || '处理图片时发生错误'
        });
    }
});

// API端点：列出所有图片（需要认证）
app.get('/api/photos', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const photos = await database.listPhotos(limit, offset);
        
        res.json({
            success: true,
            count: photos.length,
            data: photos
        });

    } catch (error) {
        console.error('获取图片列表时出错:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API端点：获取图片详情（需要认证）
app.get('/api/photos/:id', authMiddleware, async (req, res) => {
    try {
        const photo = await database.getPhoto(req.params.id);
        
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: '图片不存在'
            });
        }

        res.json({
            success: true,
            data: photo
        });

    } catch (error) {
        console.error('获取图片详情时出错:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 所有其他GET请求都返回React应用（用于支持前端路由）
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(CLIENT_BUILD_PATH, 'index.html'))) {
        res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
    } else {
        res.status(404).json({
            error: '前端文件未找到',
            message: '请先构建前端: cd client && npm run build'
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('错误:', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件大小超过限制（最大10MB）' });
        }
        return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`图片处理应用已启动`);
    console.log(`服务器运行在: http://localhost:${PORT}`);
    console.log(`========================================`);
    console.log(`可用端点:`);
    console.log(`  POST /api/photos - 上传并处理图片`);
    console.log(`  GET  /api/photos - 列出所有图片`);
    console.log(`  GET  /api/photos/:id - 获取图片详情`);
    console.log(`========================================`);
});

module.exports = app;

