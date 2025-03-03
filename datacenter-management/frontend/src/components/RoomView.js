import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, Input, InputNumber, message, Row, Col, Statistic, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DatabaseOutlined, ThunderboltOutlined, EnvironmentOutlined, AreaChartOutlined, EditOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';

const RoomView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [datacenter, setDatacenter] = useState(null);
  const [racks, setRacks] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedRack, setSelectedRack] = useState(null);
  const [editingRack, setEditingRack] = useState(null);
  const [hoveredRack, setHoveredRack] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalRacks, setOriginalRacks] = useState([]);  // 存储编辑前的机柜位置
  const [tempRacks, setTempRacks] = useState([]);         // 存储编辑过程中的临时位置

  const fetchDataCenter = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/datacenters/${id}`);
      setDatacenter(response.data);
    } catch (error) {
      console.error('Error fetching datacenter:', error);
      message.error('获取机房信息失败');
    }
  };

  const fetchRacks = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/racks/?datacenter_id=${id}`);
      setRacks(response.data);
    } catch (error) {
      console.error('Error fetching racks:', error);
      message.error('获取机柜信息失败');
    }
  };

  useEffect(() => {
    if (id) {
      fetchDataCenter();
      fetchRacks();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateRack = async (values) => {
    try {
      await axios.post('http://localhost:8000/racks/', {
        ...values,
        datacenter_id: parseInt(id, 10)
      });
      fetchRacks();
      setIsModalVisible(false);
      form.resetFields();
      message.success('机柜创建成功');
    } catch (error) {
      console.error('Error creating rack:', error);
      message.error('创建机柜失败');
    }
  };

  const handleRackClick = (rack) => {
    if (isEditMode) {
      setSelectedRack(selectedRack?.id === rack.id ? null : rack);
    } else {
      navigate(`/rack/${rack.id}`);
    }
  };

  // 进入编辑模式
  const enterEditMode = () => {
    setOriginalRacks([...racks]);  // 保存原始位置
    setTempRacks([...racks]);      // 初始化临时位置
    setIsEditMode(true);
  };

  // 完成编辑
  const finishEdit = async () => {
    try {
      // 找出位置发生变化的机柜
      const changedRacks = tempRacks.filter(temp => {
        const original = originalRacks.find(orig => orig.id === temp.id);
        return original.position_x !== temp.position_x || original.position_y !== temp.position_y;
      });

      // 批量更新位置
      await Promise.all(changedRacks.map(rack => 
        axios.put(`http://localhost:8000/racks/${rack.id}/position`, {
          position_x: rack.position_x,
          position_y: rack.position_y
        })
      ));

      setRacks(tempRacks);
      setIsEditMode(false);
      message.success('布局更新成功');
    } catch (error) {
      console.error('Error updating rack positions:', error);
      message.error('更新布局失败');
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setRacks([...originalRacks]);  // 恢复原始位置
    setIsEditMode(false);
    message.info('已取消编辑');
  };

  const handleRackDragMove = (e) => {
    const node = e.target;
    const rack = tempRacks.find(r => r.id === node.attrs.id);
    if (!rack) return;
    
    // 获取相对于画布的位置
    const pos = node.position();
    
    // 计算网格坐标（考虑缩放）
    const gridX = Math.round(pos.x / (grid_size * scale)) * grid_size * scale;
    const gridY = Math.round(pos.y / (grid_size * scale)) * grid_size * scale;

    // 限制移动范围（考虑机柜尺寸和缩放）
    const maxGridX = (Math.floor(width / grid_size) - Math.ceil(rack.depth)) * grid_size * scale;  // 使用depth
    const maxGridY = (Math.floor(height / grid_size) - Math.ceil(rack.width)) * grid_size * scale; // 使用width
    
    const boundedGridX = Math.max(0, Math.min(gridX, maxGridX));
    const boundedGridY = Math.max(0, Math.min(gridY, maxGridY));

    // 设置对齐后的位置
    node.position({
      x: boundedGridX,
      y: boundedGridY
    });
  };

  const handleRackDragEnd = async (e, rack) => {
    const node = e.target;
    
    // 获取相对于画布的位置
    const pos = node.position();
    
    // 计算网格坐标（考虑缩放）
    const gridX = Math.round(pos.x / (grid_size * scale));
    const gridY = Math.round(pos.y / (grid_size * scale));

    // 限制移动范围（考虑机柜尺寸）
    const maxGridX = Math.floor(width / grid_size) - Math.ceil(rack.depth);  // 使用depth
    const maxGridY = Math.floor(height / grid_size) - Math.ceil(rack.width); // 使用width
    
    const boundedGridX = Math.max(0, Math.min(gridX, maxGridX));
    const boundedGridY = Math.max(0, Math.min(gridY, maxGridY));

    // 检查新位置是否与其他机柜冲突
    const hasConflict = tempRacks.some(r => {
      if (r.id === rack.id) return false;
      
      // 计算两个机柜的边界
      const r1 = {
        left: boundedGridX,
        right: boundedGridX + Math.ceil(rack.depth),  // 使用depth
        top: boundedGridY,
        bottom: boundedGridY + Math.ceil(rack.width)  // 使用width
      };
      
      const r2 = {
        left: r.position_x,
        right: r.position_x + Math.ceil(r.depth),     // 使用depth
        top: r.position_y,
        bottom: r.position_y + Math.ceil(r.width)     // 使用width
      };
      
      // 检查是否重叠
      return !(r1.right <= r2.left || 
               r1.left >= r2.right || 
               r1.bottom <= r2.top || 
               r1.top >= r2.bottom);
    });

    if (hasConflict) {
      message.error('该位置已被其他机柜占用');
      // 重置到原始位置
      node.position({
        x: rack.position_x * grid_size * scale,
        y: rack.position_y * grid_size * scale
      });
      return;
    }

    // 更新临时位置
    setTempRacks(tempRacks.map(r => {
      if (r.id === rack.id) {
        return { ...r, position_x: boundedGridX, position_y: boundedGridY };
      }
      return r;
    }));

    // 设置最终位置（确保对齐到网格）
    node.position({
      x: boundedGridX * grid_size * scale,
      y: boundedGridY * grid_size * scale
    });
  };

  const handleDeleteRack = async (rackId) => {
    try {
      await axios.delete(`http://localhost:8000/racks/${rackId}`);
      message.success('机柜删除成功');
      fetchRacks();
    } catch (error) {
      console.error('Error deleting rack:', error);
      message.error('删除机柜失败');
    }
  };

  const handleEditRack = (rack, e) => {
    e.stopPropagation();
    setEditingRack(rack);
    editForm.setFieldsValue({
      name: rack.name,
      height: rack.height,
      width: rack.width,
      depth: rack.depth,
      max_power: rack.max_power,
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateRack = async (values) => {
    try {
      await axios.put(`http://localhost:8000/racks/${editingRack.id}`, {
        ...values,
        datacenter_id: parseInt(id, 10),
        position_x: editingRack.position_x,
        position_y: editingRack.position_y
      });
      fetchRacks();
      setIsEditModalVisible(false);
      editForm.resetFields();
      message.success('机柜信息更新成功');
    } catch (error) {
      console.error('Error updating rack:', error);
      message.error('更新机柜信息失败');
    }
  };

  const handleDeleteDataCenter = async () => {
    try {
      await axios.delete(`http://localhost:8000/datacenters/${id}`);
      message.success('机房删除成功');
      navigate('/');  // 删除成功后返回机房列表
    } catch (error) {
      console.error('Error deleting datacenter:', error);
      message.error('删除机房失败');
    }
  };

  if (!datacenter) {
    return <div>正在加载机房信息...</div>;
  }

  const totalPower = racks.reduce((sum, rack) => sum + rack.max_power, 0);
  const totalArea = datacenter.total_area;
  const rackCount = racks.length;

  const { width = 1000, height = 800, grid_size = 50 } = datacenter.floor_plan || {};
  // 修改缩放计算，使用更大的显示区域
  const scale = Math.min(1200 / width, 800 / height);
  
  // 计算实际显示尺寸
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  return (
    <div style={{ padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: 16 }}
      >
        返回机房列表
      </Button>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '24px' }}>
            <DatabaseOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
            {datacenter.name}
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
                  title="确定要删除这个机房吗？"
                  description={
                    <div>
                      <p>机房名称：{datacenter.name}</p>
                      <p>包含 {racks.length} 个机柜</p>
                      <p style={{ color: '#ff4d4f' }}>删除后将无法恢复，包括所有机柜和设备！</p>
                    </div>
                  }
                  onConfirm={handleDeleteDataCenter}
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
                    删除机房
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
                  添加机柜
                </Button>
              </>
            )}
          </div>
        }
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title="机柜数量"
              value={rackCount}
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总功率"
              value={totalPower}
              suffix="kW"
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总面积"
              value={totalArea}
              suffix="m²"
              prefix={<AreaChartOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="位置"
              value={datacenter.location}
              prefix={<EnvironmentOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={18}>
          <Card 
            title="平面图" 
            style={{ marginBottom: '24px' }}
            extra={isEditMode && <Tag color="warning">编辑模式：可拖动机柜调整位置</Tag>}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Stage 
                width={displayWidth} 
                height={displayHeight}
                style={{ border: '1px solid #ddd' }}
              >
                <Layer>
                  {/* 绘制网格线 */}
                  {Array.from({ length: Math.ceil(width / grid_size) + 1 }).map((_, i) => (
                    <Rect
                      key={`grid-v-${i}`}
                      x={i * grid_size * scale}
                      y={0}
                      width={1}
                      height={displayHeight}
                      fill="#ddd"
                    />
                  ))}
                  {Array.from({ length: Math.ceil(height / grid_size) + 1 }).map((_, i) => (
                    <Rect
                      key={`grid-h-${i}`}
                      x={0}
                      y={i * grid_size * scale}
                      width={displayWidth}
                      height={1}
                      fill="#ddd"
                    />
                  ))}

                  {/* 绘制机柜 */}
                  {(isEditMode ? tempRacks : racks).map((rack) => {
                    const isHovered = hoveredRack && hoveredRack.id === rack.id;
                    const isSelected = selectedRack && selectedRack.id === rack.id;
                    // 计算机柜在网格中的实际尺寸（1米 = 1个网格单位）
                    const rackWidthInGrid = rack.depth * grid_size * scale;  // 使用depth作为显示宽度
                    const rackDepthInGrid = rack.width * grid_size * scale;  // 使用width作为显示深度
                    return (
                      <Group
                        key={rack.id}
                        x={rack.position_x * grid_size * scale}
                        y={rack.position_y * grid_size * scale}
                        width={rackWidthInGrid}
                        height={rackDepthInGrid}
                        onClick={() => handleRackClick(rack)}
                        onMouseEnter={() => setHoveredRack(rack)}
                        onMouseLeave={() => setHoveredRack(null)}
                        draggable={isEditMode}
                        onDragEnd={(e) => handleRackDragEnd(e, rack)}
                        onDragMove={(e) => handleRackDragMove(e)}
                      >
                        <Rect
                          x={0}
                          y={0}
                          width={rackWidthInGrid}
                          height={rackDepthInGrid}
                          fill={isHovered ? '#e6f7ff' : '#fff'}
                          stroke={isSelected ? '#1890ff' : '#d9d9d9'}
                          strokeWidth={isHovered ? 2 : 1}
                          cornerRadius={4}
                          shadowColor="black"
                          shadowBlur={isHovered ? 10 : 5}
                          shadowOpacity={isHovered ? 0.2 : 0.1}
                          shadowOffset={{ x: 2, y: 2 }}
                        />
                        <Text
                          x={0}
                          y={rackDepthInGrid / 2 - 12}
                          width={rackWidthInGrid}
                          text={rack.name.substring(0, 1)}
                          fontSize={14}
                          fontStyle="bold"
                          fill="#666"
                          align="center"
                        />
                        <Text
                          x={0}
                          y={rackDepthInGrid / 2 + 2}
                          width={rackWidthInGrid}
                          text={rack.name.substring(1)}
                          fontSize={12}
                          fill="#666"
                          align="center"
                        />
                      </Group>
                    );
                  })}
                </Layer>
              </Stage>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card title="机柜列表" style={{ marginBottom: '24px' }}>
            {racks.map((rack) => (
              <div
                key={rack.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: hoveredRack?.id === rack.id ? '#e6f7ff' : '#fff'
                }}
                onClick={() => handleRackClick(rack)}
                onMouseEnter={() => setHoveredRack(rack)}
                onMouseLeave={() => setHoveredRack(null)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      <span style={{ fontWeight: 'bold' }}>{rack.name}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <Tag color="#87d068">{rack.height}U</Tag>
                      <Tag color="#2db7f5">{rack.max_power}kW</Tag>
                    </div>
                  </div>
                  {!isEditMode && (
                    <div>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => handleEditRack(rack, e)}
                        style={{ marginRight: '8px' }}
                      />
                      <Popconfirm
                        title="确定要删除这个机柜吗？"
                        description={
                          <div>
                            <p>机柜名称：{rack.name}</p>
                            <p style={{ color: '#ff4d4f' }}>删除后将无法恢复，包括机柜中的所有设备！</p>
                          </div>
                        }
                        onConfirm={(e) => {
                          e.stopPropagation();
                          handleDeleteRack(rack.id);
                        }}
                        okText="确定删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
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
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            添加机柜
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} onFinish={handleCreateRack} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="机柜名称"
                rules={[{ required: true, message: '请输入机柜名称' }]}
              >
                <Input prefix={<DatabaseOutlined />} placeholder="例如：A01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="height"
                label="高度（U）"
                rules={[{ required: true, message: '请输入机柜高度' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="例如：42" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="width"
                label="宽度（米）"
                rules={[{ required: true, message: '请输入机柜宽度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="例如：0.6" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="depth"
                label="深度（米）"
                rules={[{ required: true, message: '请输入机柜深度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="例如：1.0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="max_power"
                label="最大功率（kW）"
                rules={[{ required: true, message: '请输入最大功率' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：10" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position_x"
                label="X坐标（厘米）"
                rules={[{ required: true, message: '请输入X坐标' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position_y"
                label="Y坐标（厘米）"
                rules={[{ required: true, message: '请输入Y坐标' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：100" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<PlusOutlined />}>
              创建机柜
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            修改机柜信息
          </div>
        }
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={editForm} onFinish={handleUpdateRack} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="机柜名称"
                rules={[{ required: true, message: '请输入机柜名称' }]}
              >
                <Input prefix={<DatabaseOutlined />} placeholder="例如：A01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="height"
                label="高度（U）"
                rules={[{ required: true, message: '请输入机柜高度' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="例如：42" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="width"
                label="宽度（米）"
                rules={[{ required: true, message: '请输入机柜宽度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="例如：0.6" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="depth"
                label="深度（米）"
                rules={[{ required: true, message: '请输入机柜深度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="例如：1.0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="max_power"
                label="最大功率（kW）"
                rules={[{ required: true, message: '请输入最大功率' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：10" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<CheckOutlined />}>
              更新机柜信息
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomView; 