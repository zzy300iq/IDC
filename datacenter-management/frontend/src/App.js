import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import DataCenterList from './components/DataCenterList';
import RoomView from './components/RoomView';
import RackView from './components/RackView';
import DeviceView from './components/DeviceView';
import Navigation from './components/Navigation';

const { Header, Content } = Layout;

const App = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: 0 }}>
          <Navigation />
        </Header>
        <Content style={{ padding: '24px' }}>
          <Routes>
            <Route path="/" element={<DataCenterList />} />
            <Route path="/datacenter/:id" element={<RoomView />} />
            <Route path="/rack/:id" element={<RackView />} />
            <Route path="/device/:id" element={<DeviceView />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
};

export default App; 