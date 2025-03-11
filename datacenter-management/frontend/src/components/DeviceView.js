import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, Input, InputNumber, Select, message, Row, Col, Statistic, Tag, Table, Tooltip, Space, Popconfirm } from 'antd';
import { ArrowLeftOutlined, ApiOutlined, LinkOutlined, DisconnectOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const DeviceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [ports, setPorts] = useState([]);
  const [isPortModalVisible, setIsPortModalVisible] = useState(false);
  const [isEditPortModalVisible, setIsEditPortModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editingPort, setEditingPort] = useState(null);
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPortId, setSelectedPortId] = useState(null);

  const fetchDevice = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/devices/${id}`);
      setDevice(response.data);
    } catch (error) {
      console.error('Error fetching device:', error);
      message.error('获取设备信息失败');
    }
  }, [id]);

  const fetchPorts = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/ports/?device_id=${id}`);
      setPorts(response.data);
    } catch (error) {
      console.error('Error fetching ports:', error);
      message.error('获取端口信息失败');
    }
  }, [id]);

  useEffect(() => {
    fetchDevice();
    fetchPorts();
  }, [fetchDevice, fetchPorts]);

  const handleCreatePort = async (values) => {
    try {
      await axios.post('http://localhost:8000/ports/', {
        ...values,
        device_id: parseInt(id, 10)
      });
      fetchPorts();
      setIsPortModalVisible(false);
      form.resetFields();
      message.success('端口创建成功');
    } catch (error) {
      console.error('Error creating port:', error);
      message.error('创建端口失败');
    }
  };

  const handleEditPort = (port) => {
    setEditingPort(port);
    editForm.setFieldsValue({
      name: port.name,
      type: port.type,
      speed: port.speed,
      business_info: port.business_info
    });
    setIsEditPortModalVisible(true);
  };

  const handleUpdatePort = async (values) => {
    try {
      await axios.put(`http://localhost:8000/ports/${editingPort.id}`, {
        ...values,
        device_id: parseInt(id, 10)
      });
      fetchPorts();
      setIsEditPortModalVisible(false);
      editForm.resetFields();
      message.success('端口信息更新成功');
    } catch (error) {
      console.error('Error updating port:', error);
      message.error('更新端口信息失败');
    }
  };

  const handleDeletePort = async (portId) => {
    try {
      await axios.delete(`http://localhost:8000/ports/${portId}`);
      message.success('端口删除成功');
      fetchPorts();
    } catch (error) {
      console.error('Error deleting port:', error);
      message.error('删除端口失败');
    }
  };

  const showConnectModal = async (portId) => {
    try {
      const response = await axios.get('http://localhost:8000/ports/');
      const ports = response.data.map(port => ({
        ...port,
        device: {
          name: port.device?.name || '-',
          device_type: port.device?.device_type || '-',
          manufacturer: port.device?.manufacturer || '-',
          model: port.device?.model || '-'
        }
      }));
      setAvailablePorts(ports.filter(p => 
        p.device_id !== parseInt(id, 10) && !p.is_occupied
      ));
      setSelectedPortId(portId);
      setIsConnectModalVisible(true);
    } catch (error) {
      console.error('Error fetching available ports:', error);
      message.error('获取可用端口失败');
    }
  };

  const handleConnectPort = async (remotePortId) => {
    try {
      const response = await axios.put(`http://localhost:8000/ports/${selectedPortId}/connect`, {
        remote_port_id: remotePortId
      });
      await fetchPorts();  // 重新获取端口列表
      setIsConnectModalVisible(false);
      message.success(response.data.message || '端口连接成功');
    } catch (error) {
      console.error('Error connecting ports:', error);
      const errorMessage = error.response?.data?.detail || '端口连接失败';
      message.error(typeof errorMessage === 'string' ? errorMessage : '端口连接失败');
    }
  };

  const handleDisconnectPort = async (portId) => {
    try {
      await axios.put(`http://localhost:8000/ports/${portId}/disconnect`);
      fetchPorts();
      message.success('端口断开连接成功');
    } catch (error) {
      console.error('Error disconnecting port:', error);
      message.error('端口断开连接失败');
    }
  };

  const columns = [
    {
      title: '端口名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ApiOutlined style={{ color: record.is_occupied ? '#52c41a' : '#d9d9d9' }} />
          {text}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '速率',
      dataIndex: 'speed',
      key: 'speed',
      render: (text) => `${text} Mbps`,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.is_occupied ? 'success' : 'default'}>
          {record.is_occupied ? '已占用' : '空闲'}
        </Tag>
      ),
    },
    {
      title: '业务信息',
      dataIndex: 'business_info',
      key: 'business_info',
      render: (text) => text || '-',
    },
    {
      title: '远端设备',
      key: 'remote_device',
      render: (_, record) => {
        if (!record.remote_device_id) return '-';
        return (
          <Button 
            type="link" 
            onClick={() => navigate(`/device/${record.remote_device_id}`)}
          >
            查看设备
          </Button>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="编辑端口">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditPort(record)}
            />
          </Tooltip>
          {record.is_occupied ? (
            <Tooltip title="断开连接">
              <Button
                type="text"
                danger
                icon={<DisconnectOutlined />}
                onClick={() => handleDisconnectPort(record.id)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="连接端口">
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => showConnectModal(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="删除端口">
            <Popconfirm
              title="确定要删除这个端口吗？"
              description={
                <div>
                  <p>端口名称：{record.name}</p>
                  <p>端口类型：{record.type}</p>
                  <p style={{ color: '#ff4d4f' }}>删除后将无法恢复！</p>
                </div>
              }
              onConfirm={() => handleDeletePort(record.id)}
              okText="确定删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!device) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px', 
        background: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        margin: '24px'
      }}>
        <h2>正在加载设备信息...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          // 返回机柜视图时不清除滚动位置
          sessionStorage.setItem('preserveRackViewScroll', 'true');
          navigate(`/rack/${device.rack_id}`);
        }}
        style={{ marginBottom: 16 }}
      >
        返回机柜视图
      </Button>

      <Card title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ApiOutlined style={{ fontSize: '24px', marginRight: '12px', color: '#1890ff' }} />
          <span style={{ fontSize: '20px' }}>{device.name}</span>
        </div>
      }>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic title="设备类型" value={device.device_type} />
          </Col>
          <Col span={6}>
            <Statistic title="制造商" value={device.manufacturer} />
          </Col>
          <Col span={6}>
            <Statistic title="型号" value={device.model} />
          </Col>
          <Col span={6}>
            <Statistic title="序列号" value={device.serial_number} />
          </Col>
        </Row>
        <Row gutter={24} style={{ marginTop: '24px' }}>
          <Col span={6}>
            <Statistic title="位置" value={`${device.position_u}U`} />
          </Col>
          <Col span={6}>
            <Statistic title="高度" value={`${device.height_u}U`} />
          </Col>
          <Col span={6}>
            <Statistic title="功率" value={`${device.power_consumption}W`} />
          </Col>
          <Col span={6}>
            <Statistic title="IP地址" value={device.ip_address || '-'} />
          </Col>
        </Row>
      </Card>

      <Card
        title="端口信息"
        style={{ marginTop: '24px' }}
        extra={
          <Button
            type="primary"
            icon={<ApiOutlined />}
            onClick={() => setIsPortModalVisible(true)}
          >
            添加端口
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={ports}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="添加端口"
        open={isPortModalVisible}
        onCancel={() => setIsPortModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreatePort} layout="vertical">
          <Form.Item
            name="name"
            label="端口名称"
            rules={[{ required: true, message: '请输入端口名称' }]}
          >
            <Input placeholder="例如：GE1/0/1" />
          </Form.Item>
          <Form.Item
            name="type"
            label="端口类型"
            rules={[{ required: true, message: '请选择端口类型' }]}
          >
            <Select placeholder="请选择端口类型">
              <Option value="GE">GE</Option>
              <Option value="10GE">10GE</Option>
              <Option value="25GE">25GE</Option>
              <Option value="40GE">40GE</Option>
              <Option value="100GE">100GE</Option>
              <Option value="FC">FC</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="speed"
            label="端口速率(Mbps)"
            rules={[{ required: true, message: '请输入端口速率' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="business_info"
            label="业务信息"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建端口
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑端口"
        open={isEditPortModalVisible}
        onCancel={() => setIsEditPortModalVisible(false)}
        footer={null}
      >
        <Form form={editForm} onFinish={handleUpdatePort} layout="vertical">
          <Form.Item
            name="name"
            label="端口名称"
            rules={[{ required: true, message: '请输入端口名称' }]}
          >
            <Input placeholder="例如：GE1/0/1" />
          </Form.Item>
          <Form.Item
            name="type"
            label="端口类型"
            rules={[{ required: true, message: '请选择端口类型' }]}
          >
            <Select placeholder="请选择端口类型">
              <Option value="GE">GE</Option>
              <Option value="10GE">10GE</Option>
              <Option value="25GE">25GE</Option>
              <Option value="40GE">40GE</Option>
              <Option value="100GE">100GE</Option>
              <Option value="FC">FC</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="speed"
            label="端口速率(Mbps)"
            rules={[{ required: true, message: '请输入端口速率' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="business_info"
            label="业务信息"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              更新端口信息
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="连接端口"
        open={isConnectModalVisible}
        onCancel={() => setIsConnectModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={[
            {
              title: '设备名称',
              key: 'device_name',
              render: (_, record) => (
                <Space>
                  {record.device?.name}
                  {record.device?.device_type && (
                    <Tag color="blue">{record.device.device_type}</Tag>
                  )}
                </Space>
              ),
            },
            {
              title: '设备型号',
              key: 'device_model',
              render: (_, record) => (
                `${record.device?.manufacturer || ''} ${record.device?.model || ''}`.trim() || '-'
              ),
            },
            {
              title: '端口信息',
              key: 'port_info',
              render: (_, record) => (
                <Space direction="vertical" size="small">
                  <div>名称：{record.name || '-'}</div>
                  <div>
                    {record.type && <Tag color="green">{record.type}</Tag>}
                    {record.speed && <Tag color="purple">{record.speed} Mbps</Tag>}
                  </div>
                </Space>
              ),
            },
            {
              title: '业务信息',
              dataIndex: 'business_info',
              key: 'business_info',
              render: (text) => text || '-'
            },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => handleConnectPort(record.id)}
                  disabled={record.is_occupied}
                >
                  连接
                </Button>
              ),
            },
          ]}
          dataSource={availablePorts}
          rowKey="id"
          pagination={false}
        />
      </Modal>
    </div>
  );
};

export default DeviceView; 