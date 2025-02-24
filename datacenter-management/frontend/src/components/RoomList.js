import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';

const RoomList = () => {
  const [dataCenters, setDataCenters] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDataCenters();
  }, []);

  const fetchDataCenters = async () => {
    try {
      const response = await axios.get('http://localhost:8000/datacenters/');
      setDataCenters(response.data);
    } catch (error) {
      console.error('Error fetching data centers:', error);
      message.error('获取机房列表失败');
    }
  };

  const handleCreate = async (values) => {
    try {
      await axios.post('http://localhost:8000/datacenters/', values);
      fetchDataCenters();
      setIsModalVisible(false);
      form.resetFields();
      message.success('机房创建成功');
    } catch (error) {
      console.error('Error creating data center:', error);
      message.error('创建机房失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/datacenters/${id}`);
      message.success('机房删除成功');
      fetchDataCenters();
    } catch (error) {
      console.error('Error deleting datacenter:', error);
      message.error('删除机房失败');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsModalVisible(true)}
        style={{ marginBottom: 16 }}
      >
        添加机房
      </Button>

      <Row gutter={[16, 16]}>
        {dataCenters.map((dc) => (
          <Col key={dc.id} xs={24} sm={12} md={8} lg={6}>
            <Link to={`/datacenter/${dc.id}`} style={{ display: 'block' }}>
              <Card 
                title={dc.name}
                hoverable
                extra={
                  <Popconfirm
                    title="确定要删除这个机房吗？"
                    description="删除后将无法恢复，包括其中的所有机柜和设备。"
                    onConfirm={(e) => {
                      e.preventDefault();
                      handleDelete(dc.id);
                    }}
                    onCancel={(e) => {
                      e.preventDefault();
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.preventDefault()}
                    />
                  </Popconfirm>
                }
              >
                <p>位置：{dc.location}</p>
                <p>总面积：{dc.total_area} 平方米</p>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      <Modal
        title="添加机房"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="name"
            label="机房名称"
            rules={[{ required: true, message: '请输入机房名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="location"
            label="位置"
            rules={[{ required: true, message: '请输入机房位置' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="total_area"
            label="总面积（平方米）"
            rules={[{ required: true, message: '请输入总面积' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomList; 