/**
 * 相册路由模块
 * 处理相册的创建、列表、详情等操作
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const database = require('../database');  // 使用新的数据库入口

/**
 * POST /api/albums - 创建新相册
 * 需要认证
 * Body: { name }
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: '相册名称不能为空'
            });
        }

        const album = await database.createAlbum({
            name: name.trim(),
            owner: req.user.username,
            userId: req.user.id
        });

        console.log(`用户 ${req.user.username} 创建了相册: ${name}`);

        res.status(201).json({
            success: true,
            message: '相册创建成功',
            data: album
        });

    } catch (error) {
        console.error('创建相册失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '创建相册失败'
        });
    }
});

/**
 * GET /api/albums - 获取当前用户的所有相册
 * 需要认证
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 999;
        const albums = await database.listAlbumsByUser(req.user.id, limit);

        res.json({
            success: true,
            count: albums.length,
            data: albums
        });

    } catch (error) {
        console.error('获取相册列表失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '获取相册列表失败'
        });
    }
});

/**
 * GET /api/albums/:id - 获取相册详情
 * 需要认证
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const album = await database.getAlbum(req.params.id);

        if (!album) {
            return res.status(404).json({
                success: false,
                error: '相册不存在'
            });
        }

        // 检查权限：只有相册的所有者可以查看
        if (album.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: '无权访问此相册'
            });
        }

        res.json({
            success: true,
            data: album
        });

    } catch (error) {
        console.error('获取相册详情失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '获取相册详情失败'
        });
    }
});

/**
 * GET /api/albums/:albumId/photos - 获取相册中的照片列表
 * 需要认证
 */
router.get('/:albumId/photos', authMiddleware, async (req, res) => {
    try {
        const { albumId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        // 验证相册是否存在且属于当前用户
        const album = await database.getAlbum(albumId);
        
        if (!album) {
            return res.status(404).json({
                success: false,
                error: '相册不存在'
            });
        }

        if (album.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: '无权访问此相册'
            });
        }

        const photos = await database.listPhotosByAlbum(albumId, limit, offset);

        res.json({
            success: true,
            count: photos.length,
            data: photos,
            hasMore: photos.length === limit
        });

    } catch (error) {
        console.error('获取相册照片列表失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '获取相册照片列表失败'
        });
    }
});

/**
 * DELETE /api/albums/:id - 删除相册
 * 需要认证
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const album = await database.getAlbum(req.params.id);

        if (!album) {
            return res.status(404).json({
                success: false,
                error: '相册不存在'
            });
        }

        // 检查权限
        if (album.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: '无权删除此相册'
            });
        }

        await database.deleteAlbum(req.params.id);

        console.log(`用户 ${req.user.username} 删除了相册: ${album.name}`);

        res.json({
            success: true,
            message: '相册删除成功'
        });

    } catch (error) {
        console.error('删除相册失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '删除相册失败'
        });
    }
});

module.exports = router;

