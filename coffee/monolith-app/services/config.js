/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

/**
 * 配置服务
 * 负责管理应用配置（菜单、商店状态等）
 */

const database = require('./database');

/**
 * 获取配置
 * GET /config?eventId=ABC
 */
async function getConfig(req, res) {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '缺少eventId参数' 
      });
    }
    
    console.log(`[Config] 获取配置: ${eventId}`);
    
    const configKey = `config-${eventId}`;
    const config = database.getItem('config', { PK: configKey });
    
    if (!config) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: '配置不存在' 
      });
    }
    
    res.status(200).json(config);
    
  } catch (error) {
    console.error('[Config] 获取配置错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 更新配置
 * PUT /config?eventId=ABC
 */
async function updateConfig(req, res) {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '缺少eventId参数' 
      });
    }
    
    console.log(`[Config] 更新配置: ${eventId}`);
    
    const configKey = `config-${eventId}`;
    const existingConfig = database.getItem('config', { PK: configKey });
    
    if (!existingConfig) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: '配置不存在' 
      });
    }
    
    // 更新配置
    const updates = req.body;
    const updatedConfig = database.updateItem('config', { PK: configKey }, updates);
    
    console.log('[Config] 配置更新成功');
    
    // 发布配置变更事件
    global.eventBus.emit('ConfigService.ConfigChanged', {
      'detail-type': 'ConfigService.ConfigChanged',
      source: 'presso',
      detail: {
        NewImage: updatedConfig
      },
      time: new Date().toISOString()
    });
    
    res.status(200).json({
      message: '配置更新成功',
      config: updatedConfig
    });
    
  } catch (error) {
    console.error('[Config] 更新配置错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 扫描所有配置
 * GET /config/all
 */
async function scanConfig(req, res) {
  try {
    console.log('[Config] 扫描所有配置');
    
    const configs = database.scan('config', {});
    
    res.status(200).json(configs);
    
  } catch (error) {
    console.error('[Config] 扫描配置错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

module.exports = {
  getConfig,
  updateConfig,
  scanConfig
};

