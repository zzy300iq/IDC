import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const Navigation = () => {
  const location = useLocation();

  return (
    <Menu
      theme="light"
      mode="horizontal"
      selectedKeys={[location.pathname]}
      style={{ lineHeight: '64px' }}
    >
      <Menu.Item key="/" icon={<HomeOutlined />}>
        <Link to="/">机房列表</Link>
      </Menu.Item>
    </Menu>
  );
};

export default Navigation; 