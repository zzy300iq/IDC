import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, Input, InputNumber, Select, message, Row, Col, Statistic, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DatabaseOutlined, ThunderboltOutlined, DesktopOutlined, ApiOutlined, HddOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';

const { Option } = Select;

const DeviceTypeIcons = {
  server: <DesktopOutlined />,
  switch: <ApiOutlined />,
  storage: <HddOutlined />,
  other: <DatabaseOutlined />
};

const DeviceTypeColors = {
  server: '#1890ff',
  switch: '#52c41a',
  storage: '#722ed1',
  other: '#faad14'
};

const RackView = () => {
  const { id } = useParams();
  const navigate = useNavigate();  // 添加导航hook
  const [rack, setRack] = useState(null);
  const [devices, setDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const stageRef = useRef(null);
  const GRID_SIZE = 60;  // 增加网格高度到60px
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalDevices, setOriginalDevices] = useState([]);  // 存储编辑前的设备位置
  const [isEditDeviceModalVisible, setIsEditDeviceModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editForm] = Form.useForm();

  const fetchRack = async () => {
    try {
      console.log('Fetching rack data for ID:', id);
      const response = await axios.get(`http://localhost:8000/racks/${id}`);
      console.log('Rack data received:', response.data);
      setRack(response.data);
    } catch (error) {
      console.error('Error fetching rack:', error);
      message.error('获取机柜信息失败: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchDevices = async () => {
    try {
      console.log('Fetching devices for rack ID:', id);
      const response = await axios.get(`http://localhost:8000/devices/?rack_id=${id}`);
      console.log('Devices data received:', response.data);
      setDevices(response.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
      message.error('获取设备信息失败: ' + (error.response?.data?.detail || error.message));
    }
  };

  useEffect(() => {
    if (id) {
      console.log('RackView mounted with ID:', id);
      fetchRack();
      fetchDevices();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateDevice = async (values) => {
    try {
      await axios.post('http://localhost:8000/devices/', {
        ...values,
        rack_id: parseInt(id, 10),
        status: 'active'
      });
      fetchDevices();
      setIsModalVisible(false);
      form.resetFields();
      message.success('设备创建成功');
    } catch (error) {
      console.error('Error creating device:', error);
      message.error('创建设备失败');
    }
  };

  const handleDeviceDragMove = (device, e) => {
    const node = e.target;
    const stage = node.getStage();
    const scale = GRID_SIZE;
    const stageHeight = stage.height();
    const stageWidth = stage.width();
    
    // 计算最近的网格位置（垂直和水平）
    let y = node.y();
    const x = Math.round(node.x() / 50) * 50;
    
    // 限制水平移动范围
    const boundedX = Math.max(0, Math.min(x, stageWidth - 300));
    
    // 限制垂直移动范围，考虑设备高度
    const maxY = stageHeight - (device.height_u * scale); // 考虑设备实际高度
    const minY = 0;
    const boundedY = Math.max(minY, Math.min(y, maxY));
    
    // 设置节点位置，强制对齐到网格
    node.y(Math.round(boundedY / scale) * scale);
    node.x(boundedX);
  };

  const handleDeviceDragEnd = async (device, e) => {
    const node = e.target;
    const stage = node.getStage();
    const scale = GRID_SIZE;
    const stageHeight = stage.height();
    const stageWidth = stage.width();
    
    // 计算对齐到网格的U位置
    let newPositionU = Math.round((stageHeight - node.y()) / scale);
    
    // 计算水平位置（转换为百分比）
    const horizontalPosition = Math.round((node.x() / stageWidth) * 100);
    
    // 确保设备不会超出机柜范围，考虑设备高度
    newPositionU = Math.max(device.height_u, Math.min(newPositionU, rack.height));
    
    // 检查新位置是否与其他设备冲突
    const hasConflict = devices.some(d => {
      if (d.id === device.id) return false;
      // 考虑设备高度，检查是否有重叠
      const deviceStart = newPositionU - device.height_u + 1;
      const deviceEnd = newPositionU;
      const otherStart = d.position_u - d.height_u + 1;
      const otherEnd = d.position_u;
      return (deviceStart <= otherEnd && deviceEnd >= otherStart);
    });

    if (hasConflict) {
      message.error('该位置已被其他设备占用');
      // 重置位置到原始位置
      node.y(stageHeight - device.position_u * scale);
      node.x(0);
      return;
    }

    try {
      await axios.put(`http://localhost:8000/devices/${device.id}/position`, {
        position_u: newPositionU,
        rack_id: parseInt(id, 10),
        horizontal_position: horizontalPosition
      });
      
      // 更新本地状态
      setDevices(devices.map(d => {
        if (d.id === device.id) {
          return { ...d, position_u: newPositionU, horizontal_position: horizontalPosition };
        }
        return d;
      }));
      
      message.success('设备位置已更新');
    } catch (error) {
      console.error('Error updating device position:', error);
      message.error('更新设备位置失败');
      // 重置位置到原始位置
      node.y(stageHeight - device.position_u * scale);
      node.x(0);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    try {
      await axios.delete(`http://localhost:8000/devices/${deviceId}`);
      message.success('设备删除成功');
      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      message.error('删除设备失败');
    }
  };

  const handleDeleteRack = async () => {
    try {
      const response = await axios.delete(`http://localhost:8000/racks/${id}`);
      message.success('机柜删除成功');
      // 返回到数据中心视图
      navigate(`/datacenter/${response.data.datacenter_id}`);
    } catch (error) {
      console.error('Error deleting rack:', error);
      message.error('删除机柜失败');
    }
  };

  // 进入编辑模式
  const enterEditMode = () => {
    setOriginalDevices([...devices]);  // 保存原始位置
    setIsEditMode(true);
  };

  // 完成编辑
  const finishEdit = async () => {
    try {
      // 找出位置发生变化的设备
      const changedDevices = devices.filter(device => {
        const original = originalDevices.find(orig => orig.id === device.id);
        return original.position_u !== device.position_u;
      });

      // 批量更新位置
      await Promise.all(changedDevices.map(device => 
        axios.put(`http://localhost:8000/devices/${device.id}/position`, {
          position_u: device.position_u,
          rack_id: parseInt(id, 10)
        })
      ));

      setIsEditMode(false);
      message.success('设备布局更新成功');
    } catch (error) {
      console.error('Error updating device positions:', error);
      message.error('更新设备布局失败');
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setDevices([...originalDevices]);  // 恢复原始位置
    setIsEditMode(false);
    message.info('已取消编辑');
  };

  const handleEditDevice = (device, e) => {
    e.stopPropagation();
    setEditingDevice(device);
    editForm.setFieldsValue({
      name: device.name,
      device_type: device.device_type,
      manufacturer: device.manufacturer,
      model: device.model,
      serial_number: device.serial_number,
      position_u: device.position_u,
      height_u: device.height_u,
      power_consumption: device.power_consumption,
      ip_address: device.ip_address
    });
    setIsEditDeviceModalVisible(true);
  };

  const handleUpdateDevice = async (values) => {
    try {
      const response = await axios.put(`http://localhost:8000/devices/${editingDevice.id}`, {
        ...values,
        rack_id: parseInt(id, 10),
        status: editingDevice.status
      });
      
      if (response.data) {
        await fetchDevices(); // 重新获取设备列表
        setIsEditDeviceModalVisible(false);
        editForm.resetFields();
        message.success('设备信息更新成功');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      const errorMessage = error.response?.data?.detail || error.message || '更新设备信息失败';
      message.error(`更新设备信息失败: ${errorMessage}`);
    }
  };

  if (!rack) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>加载机柜信息中...</h2>
      <p>机柜 ID: {id}</p>
    </div>;
  }

  const totalPower = devices.reduce((sum, device) => sum + device.power_consumption, 0) / 1000; // 转换为kW
  const powerUsagePercent = (totalPower / rack.max_power) * 100;

  return (
    <div style={{ padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/datacenter/${rack?.datacenter_id}`)}
        style={{ marginBottom: 16 }}
      >
        返回机房视图
      </Button>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px' }}>
            <DatabaseOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            {rack.name}
          </div>
        }
        extra={
          <div>
            {isEditMode ? (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={finishEdit}
                  style={{ marginRight: 8 }}
                >
                  完成编辑
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={cancelEdit}
                  style={{ marginRight: 8 }}
                >
                  取消编辑
                </Button>
              </>
            ) : (
              <>
                <Popconfirm
                  title="确定要删除这个机柜吗？"
                  description={
                    <div>
                      <p>机柜名称：{rack.name}</p>
                      <p>包含 {devices.length} 个设备</p>
                      <p style={{ color: '#ff4d4f' }}>删除后将无法恢复，包括机柜中的所有设备！</p>
                    </div>
                  }
                  onConfirm={handleDeleteRack}
                  okText="确定删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ marginRight: 8 }}
                  >
                    删除机柜
                  </Button>
                </Popconfirm>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={enterEditMode}
                  style={{ marginRight: 8 }}
                >
                  编辑布局
                </Button>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setIsModalVisible(true)}
                >
                  添加设备
                </Button>
              </>
            )}
          </div>
        }
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="机柜高度"
              value={rack.height}
              suffix="U"
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已用功率"
              value={totalPower.toFixed(2)}
              suffix={`kW / ${rack.max_power}kW`}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: powerUsagePercent > 80 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="设备数量"
              value={devices.length}
              prefix={<DesktopOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          <Card 
            title="机柜视图" 
            style={{ marginBottom: '24px' }}
            extra={isEditMode && <Tag color="warning">编辑模式：可拖动设备调整位置</Tag>}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Stage
                ref={stageRef}
                width={300}
                height={rack.height * GRID_SIZE}  // 使用新的网格高度
                style={{ 
                  border: '1px solid #e8e8e8',
                  borderRadius: '8px',
                  background: 'linear-gradient(to bottom, #fafafa, #f5f5f5)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Layer>
                  {/* 绘制背景网格 - 只保留横线 */}
                  {Array.from({ length: rack.height }).map((_, i) => (
                    <React.Fragment key={`grid-${i}`}>
                      <Rect
                        x={0}
                        y={i * GRID_SIZE}
                        width={300}
                        height={GRID_SIZE}
                        stroke="rgba(0,0,0,0.03)"
                        strokeWidth={0.5}
                      />
                    </React.Fragment>
                  ))}

                  {/* 绘制设备 */}
                  {devices.map((device) => {
                    const isHovered = hoveredDevice?.id === device.id;
                    const isSelected = selectedDevice?.id === device.id;
                    return (
                      <Group
                        key={device.id}
                        x={device.horizontal_position || 0}
                        y={rack.height * GRID_SIZE - device.position_u * GRID_SIZE}
                        draggable={isEditMode}  // 只在编辑模式下可拖动
                        onDragStart={() => setSelectedDevice(device)}
                        onDragMove={(e) => handleDeviceDragMove(device, e)}
                        onDragEnd={(e) => handleDeviceDragEnd(device, e)}
                        onMouseEnter={() => setHoveredDevice(device)}
                        onMouseLeave={() => setHoveredDevice(null)}
                      >
                        <Rect
                          width={300}
                          height={device.height_u * GRID_SIZE - 4}  // 根据U数计算高度
                          y={2}
                          fill={isHovered ? `${DeviceTypeColors[device.device_type]}15` : '#fff'}
                          stroke={DeviceTypeColors[device.device_type]}
                          strokeWidth={isSelected ? 2 : 1}
                          shadowColor="black"
                          shadowBlur={isHovered ? 15 : 8}
                          shadowOpacity={isHovered ? 0.2 : 0.1}
                          cornerRadius={4}
                        />
                        <Text
                          text={`${device.name} (${device.height_u}U)`}
                          fontSize={13}
                          fontStyle="bold"
                          fill={DeviceTypeColors[device.device_type]}
                          width={280}
                          align="left"
                          x={16}
                          y={12}
                        />
                        <Text
                          text={`${device.manufacturer} ${device.model}`}
                          fontSize={11}
                          fill="#666"
                          width={280}
                          align="left"
                          x={16}
                          y={34}
                        />
                        <Text
                          text={`${device.power_consumption}W | ${device.ip_address || 'N/A'}`}
                          fontSize={11}
                          fill="#666"
                          width={280}
                          align="right"
                          x={16}
                          y={device.height_u * GRID_SIZE - 24}  // 底部显示功率和IP
                        />
                        <Rect
                          width={4}
                          height={device.height_u * GRID_SIZE - 4}  // 根据U数计算高度
                          y={2}
                          fill={DeviceTypeColors[device.device_type]}
                          cornerRadius={[2, 0, 0, 2]}
                        />
                      </Group>
                    );
                  })}
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="设备列表" style={{ marginBottom: '24px' }}>
            {devices.map((device) => (
              <div
                key={device.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: hoveredDevice?.id === device.id ? '#e6f7ff' : '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={() => setHoveredDevice(device)}
                onMouseLeave={() => setHoveredDevice(null)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    {DeviceTypeIcons[device.device_type]}
                    <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>{device.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <Tag color={DeviceTypeColors[device.device_type]}>{device.device_type}</Tag>
                    <Tag color="#2db7f5">{device.power_consumption}W</Tag>
                  </div>
                </div>
                {!isEditMode && (
                  <div>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={(e) => handleEditDevice(device, e)}
                      style={{ marginRight: 8 }}
                    />
                    <Popconfirm
                      title="确定要删除这个设备吗？"
                      description="删除后将无法恢复。"
                      onConfirm={() => handleDeleteDevice(device.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            添加设备
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} onFinish={handleCreateDevice} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="设备名称"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input prefix={<DatabaseOutlined />} placeholder="例如：Web服务器01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="device_type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select>
                  <Option value="server">
                    <DesktopOutlined /> 服务器
                  </Option>
                  <Option value="switch">
                    <ApiOutlined /> 交换机
                  </Option>
                  <Option value="storage">
                    <HddOutlined /> 存储设备
                  </Option>
                  <Option value="other">
                    <DatabaseOutlined /> 其他
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufacturer"
                label="制造商"
                rules={[{ required: true, message: '请输入制造商' }]}
              >
                <Input placeholder="例如：Dell" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="model"
                label="型号"
                rules={[{ required: true, message: '请输入型号' }]}
              >
                <Input placeholder="例如：PowerEdge R740" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serial_number"
                label="序列号"
                rules={[{ required: true, message: '请输入序列号' }]}
              >
                <Input placeholder="例如：DELL-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ip_address"
                label="IP地址"
              >
                <Input placeholder="例如：192.168.1.100" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="position_u"
                label="起始U位"
                rules={[{ required: true, message: '请输入起始U位' }]}
              >
                <InputNumber min={1} max={rack.height} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="height_u"
                label="高度（U）"
                rules={[{ required: true, message: '请输入设备高度' }]}
              >
                <InputNumber min={1} max={rack.height} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="power_consumption"
                label="功率消耗（W）"
                rules={[{ required: true, message: '请输入功率消耗' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  prefix={<ThunderboltOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<PlusOutlined />}>
              创建设备
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            编辑设备信息
          </div>
        }
        open={isEditDeviceModalVisible}
        onCancel={() => {
          setIsEditDeviceModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form form={editForm} onFinish={handleUpdateDevice} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="设备名称"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input prefix={<DatabaseOutlined />} placeholder="例如：Web服务器01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="device_type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select>
                  <Option value="server">
                    <DesktopOutlined /> 服务器
                  </Option>
                  <Option value="switch">
                    <ApiOutlined /> 交换机
                  </Option>
                  <Option value="storage">
                    <HddOutlined /> 存储设备
                  </Option>
                  <Option value="other">
                    <DatabaseOutlined /> 其他
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufacturer"
                label="制造商"
                rules={[{ required: true, message: '请输入制造商' }]}
              >
                <Input placeholder="例如：Dell" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="model"
                label="型号"
                rules={[{ required: true, message: '请输入型号' }]}
              >
                <Input placeholder="例如：PowerEdge R740" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serial_number"
                label="序列号"
                rules={[{ required: true, message: '请输入序列号' }]}
              >
                <Input placeholder="例如：DELL-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ip_address"
                label="IP地址"
              >
                <Input placeholder="例如：192.168.1.100" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="position_u"
                label="起始U位"
                rules={[{ required: true, message: '请输入起始U位' }]}
              >
                <InputNumber min={1} max={rack.height} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="height_u"
                label="高度（U）"
                rules={[{ required: true, message: '请输入设备高度' }]}
              >
                <InputNumber min={1} max={rack.height} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="power_consumption"
                label="功率消耗（W）"
                rules={[{ required: true, message: '请输入功率消耗' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  prefix={<ThunderboltOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<CheckOutlined />}>
              更新设备信息
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RackView; 