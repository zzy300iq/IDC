# 数据中心设备管理系统

这是一个用于管理数据中心机房、机柜和设备的Web应用系统。

## 功能特点

- 机房平面图展示和管理
- 机柜布局展示和管理
- 设备信息管理和位置调整
- 设备信息查询
- 拖拽式设备位置调整
- 实时数据更新

## 技术栈

### 前端
- React 18
- TypeScript
- Ant Design 5.x
- React DnD（拖拽功能）

### 后端
- Python 3.9+
- FastAPI
- SQLAlchemy
- MySQL 8.4

## 安装说明

### 前端安装
```bash
cd frontend
npm install
npm start
```

### 后端安装
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows使用: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 数据库配置
1. 安装MySQL 8.4
2. 创建数据库：
```sql
CREATE DATABASE datacenter_management;
```
3. 在backend/.env文件中配置数据库连接信息

## 项目结构
```
datacenter-management/
├── frontend/          # 前端React应用
├── backend/           # 后端FastAPI应用
└── docs/             # 项目文档
``` 