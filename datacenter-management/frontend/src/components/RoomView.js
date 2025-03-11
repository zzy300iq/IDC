import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, Input, InputNumber, message, Row, Col, Statistic, Tag, Popconfirm, Select } from 'antd';
import { PlusOutlined, DatabaseOutlined, ThunderboltOutlined, EnvironmentOutlined, AreaChartOutlined, EditOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva';

const { Option } = Select;

// 设施类型颜色映射
const FacilityTypeColors = {
  'AC': '#20B2AA',       // 空调（蓝绿色）
  'MONITOR': '#90EE90',  // 监控（浅绿色）
  'FM200': '#FFB6C1',    // 七氟丙烷（粉色）
  'FIRE_EXT': '#FF4500', // 灭火器（红色）
  'POWER': '#FF69B4',    // 电力柜（粉红色）
  'AC_CAB': '#DDA0DD',   // 空调柜（紫色）
  'EMPTY': '#A9A9A9',    // 空柜（灰色）
  'ODF': '#FFD700'       // ODF（黄色）
};

// 设施类型名称映射
const FacilityTypeNames = {
  'AC': '空调',
  'MONITOR': '监控',
  'FM200': '七氟丙烷',
  'FIRE_EXT': '灭火器',
  'POWER': '电力柜',
  'AC_CAB': '空调柜',
  'EMPTY': '空柜',
  'ODF': 'ODF'
};

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
  const [facilities, setFacilities] = useState([]);
  const [originalFacilities, setOriginalFacilities] = useState([]);
  const [isFacilityModalVisible, setIsFacilityModalVisible] = useState(false);
  const [facilityForm] = Form.useForm();
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [hoveredFacility, setHoveredFacility] = useState(null);
  const [tempFacilities, setTempFacilities] = useState([]);
  const [isEditFacilityModalVisible, setIsEditFacilityModalVisible] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [editFacilityForm] = Form.useForm();
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState(0); // -1: 左, 1: 右, 0: 停止
  const scrollAnimationRef = useRef(null);

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

  const fetchFacilities = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/facilities/?datacenter_id=${id}`);
      setFacilities(response.data);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      message.error('获取设施列表失败');
    }
  };

  useEffect(() => {
    if (id) {
      fetchDataCenter();
      fetchRacks();
      fetchFacilities();
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
    if (!isEditMode) {
      // 保存当前滚动位置
      sessionStorage.setItem('datacenterViewScrollPosition', window.scrollY.toString());
      navigate(`/rack/${rack.id}`);
    }
  };

  // 在组件加载时恢复滚动位置
  useEffect(() => {
    if (datacenter && racks.length > 0) {
      const preserveScroll = sessionStorage.getItem('preserveDatacenterViewScroll');
      const savedScrollPosition = sessionStorage.getItem('datacenterViewScrollPosition');
      
      if (preserveScroll === 'true' && savedScrollPosition) {
        // 使用setTimeout确保DOM完全渲染后再滚动
        setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedScrollPosition),
            behavior: 'instant'
          });
          sessionStorage.removeItem('preserveDatacenterViewScroll');
        }, 100);
      } else if (!preserveScroll) {
        sessionStorage.removeItem('datacenterViewScrollPosition');
      }
    }
  }, [datacenter, racks]); // 当数据中心和机柜数据都加载完成时执行

  // 进入编辑模式
  const enterEditMode = () => {
    setIsEditMode(true);
    setOriginalRacks([...racks]);
    setTempRacks([...racks]);
    setOriginalFacilities([...facilities]);
    setTempFacilities([...facilities]);
  };

  // 完成编辑
  const finishEdit = async () => {
    try {
      // 更新机柜位置
      for (const rack of tempRacks) {
        const originalRack = originalRacks.find(r => r.id === rack.id);
        if (originalRack &&
            (originalRack.position_x !== rack.position_x ||
             originalRack.position_y !== rack.position_y)) {
          await axios.put(`http://localhost:8000/racks/${rack.id}/position`, {
            position_x: rack.position_x,
            position_y: rack.position_y
          });
        }
      }

      // 更新设施位置
      for (const facility of tempFacilities) {
        const originalFacility = originalFacilities.find(f => f.id === facility.id);
        if (originalFacility &&
            (originalFacility.position_x !== facility.position_x ||
             originalFacility.position_y !== facility.position_y)) {
          await axios.put(`http://localhost:8000/facilities/${facility.id}`, {
            ...facility
          });
        }
      }

      // 直接更新状态，而不是重新获取数据
      setRacks(tempRacks);
      setFacilities(tempFacilities);
      setIsEditMode(false);
      setSelectedRack(null);
      setSelectedFacility(null);
      message.success('位置更新成功');
    } catch (error) {
      console.error('Error updating positions:', error);
      message.error('更新位置失败');
      // 发生错误时才重新获取数据
      fetchRacks();
      fetchFacilities();
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditMode(false);
    setTempRacks([...originalRacks]);
    setTempFacilities([...originalFacilities]);
    setSelectedRack(null);
    setSelectedFacility(null);
  };

  // 自动滚动动画
  const autoScroll = useCallback(() => {
    if (!autoScrolling) return;

    const scrollContainer = document.querySelector('.room-view-scroll-container');
    if (!scrollContainer) return;

    const scrollSpeed = 15;  // 修改滚动速度为15像素/帧
    scrollContainer.scrollLeft += scrollDirection * scrollSpeed;

    scrollAnimationRef.current = requestAnimationFrame(autoScroll);
  }, [autoScrolling, scrollDirection]);

  // 开始自动滚动
  const startAutoScroll = useCallback((direction) => {
    setScrollDirection(direction);
    setAutoScrolling(true);
  }, []);

  // 停止自动滚动
  const stopAutoScroll = useCallback(() => {
    setAutoScrolling(false);
    setScrollDirection(0);
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }
  }, []);

  // 当组件卸载时清理动画
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  // 当autoScrolling或scrollDirection改变时启动/停止动画
  useEffect(() => {
    if (autoScrolling) {
      scrollAnimationRef.current = requestAnimationFrame(autoScroll);
    } else {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    }
  }, [autoScrolling, autoScroll]);

  const handleRackDragMove = (e) => {
    const node = e.target;
    const rack = tempRacks.find(r => r.id === node.attrs.id);
    if (!rack) return;

    const stage = node.getStage();
    const scale = grid_size/4;
    const pos = node.position();

    // 获取滚动容器
    const containerRect = stage.container().parentElement.getBoundingClientRect();
    const mouseX = e.evt.clientX - containerRect.left;
    const scrollThreshold = 100;

    // 根据鼠标位置决定滚动方向
    if (mouseX > containerRect.width - scrollThreshold) {
      startAutoScroll(1); // 向右滚动
    } else if (mouseX < scrollThreshold) {
      startAutoScroll(-1); // 向左滚动
    } else {
      stopAutoScroll(); // 停止滚动
    }

    // 限制拖动范围
    const maxX = Math.floor(width * 2 / (grid_size/4)) - Math.ceil(rack.depth * 4);
    const maxY = Math.floor(height / (grid_size/4)) - Math.ceil(rack.width * 4);
    const gridX = Math.round(pos.x / scale);
    const gridY = Math.round(pos.y / scale);
    const boundedGridX = Math.max(0, Math.min(gridX, maxX));
    const boundedGridY = Math.max(0, Math.min(gridY, maxY));

    node.position({
      x: boundedGridX * scale,
      y: boundedGridY * scale
    });
  };

  const handleRackDragEnd = async (e, rack) => {
    stopAutoScroll();
    const node = e.target;
    const pos = node.position();
    const gridX = Math.round(pos.x / ((grid_size/4) * scale));
    const gridY = Math.round(pos.y / ((grid_size/4) * scale));
    const maxGridX = Math.floor(width / (grid_size/4)) - Math.ceil(rack.depth * 4);
    const maxGridY = Math.floor(height / (grid_size/4)) - Math.ceil(rack.width * 4);
    const boundedGridX = Math.max(0, Math.min(gridX, maxGridX));
    const boundedGridY = Math.max(0, Math.min(gridY, maxGridY));

    // 计算机柜的边界框
    const rackBounds = {
      left: boundedGridX,
      right: boundedGridX + Math.ceil(rack.depth * 4),
      top: boundedGridY,
      bottom: boundedGridY + Math.ceil(rack.width * 4)
    };

    // 检查新位置是否与其他机柜冲突
    const hasConflictWithRacks = tempRacks.some(r => {
      if (r.id === rack.id) return false;
      
      const r2 = {
        left: r.position_x,
        right: r.position_x + Math.ceil(r.depth * 4),
        top: r.position_y,
        bottom: r.position_y + Math.ceil(r.width * 4)
      };
      
      return !(rackBounds.right <= r2.left || 
               rackBounds.left >= r2.right || 
               rackBounds.bottom <= r2.top || 
               rackBounds.top >= r2.bottom);
    });

    // 检查新位置是否与设施冲突
    const hasConflictWithFacilities = tempFacilities.some(facility => {
      // 计算设施的旋转边界
      const rotation = facility.rotation || 0;
      const radians = (rotation * Math.PI) / 180;
      const facilityWidth = Math.ceil(facility.width * 4);
      const facilityHeight = Math.ceil(facility.height * 4);
      
      // 计算旋转后的四个角点坐标
      const corners = [
        { x: facility.position_x, y: facility.position_y },
        { x: facility.position_x + facilityWidth * Math.cos(radians), 
          y: facility.position_y + facilityWidth * Math.sin(radians) },
        { x: facility.position_x + facilityWidth * Math.cos(radians) - facilityHeight * Math.sin(radians),
          y: facility.position_y + facilityWidth * Math.sin(radians) + facilityHeight * Math.cos(radians) },
        { x: facility.position_x - facilityHeight * Math.sin(radians), 
          y: facility.position_y + facilityHeight * Math.cos(radians) }
      ];

      // 计算设施的边界框
      const facilityBounds = {
        left: Math.min(...corners.map(c => c.x)),
        right: Math.max(...corners.map(c => c.x)),
        top: Math.min(...corners.map(c => c.y)),
        bottom: Math.max(...corners.map(c => c.y))
      };

      // 检查是否重叠
      return !(rackBounds.right <= facilityBounds.left || 
               rackBounds.left >= facilityBounds.right || 
               rackBounds.bottom <= facilityBounds.top || 
               rackBounds.top >= facilityBounds.bottom);
    });

    if (hasConflictWithRacks) {
      message.error('该位置已被其他机柜占用');
      // 重置到原始位置
      node.position({
        x: rack.position_x * (grid_size/4) * scale,
        y: rack.position_y * (grid_size/4) * scale
      });
      return;
    }

    if (hasConflictWithFacilities) {
      message.error('该位置与设施位置冲突');
      // 重置到原始位置
      node.position({
        x: rack.position_x * (grid_size/4) * scale,
        y: rack.position_y * (grid_size/4) * scale
      });
      return;
    }

    // 更新临时位置
    setTempRacks(tempRacks.map(r => {
      if (r.id === rack.id) {
        return { 
          ...r, 
          position_x: boundedGridX,
          position_y: boundedGridY
        };
      }
      return r;
    }));

    // 设置最终位置（确保对齐到细分网格）
    node.position({
      x: boundedGridX * (grid_size/4) * scale,
      y: boundedGridY * (grid_size/4) * scale
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

  const handleDeleteFacility = async (facilityId) => {
    try {
      await axios.delete(`http://localhost:8000/facilities/${facilityId}`);
      message.success('设施删除成功');
      fetchFacilities();
    } catch (error) {
      console.error('Error deleting facility:', error);
      message.error('删除设施失败');
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

  const handleCreateFacility = async (values) => {
    try {
      await axios.post('http://localhost:8000/facilities/', {
        ...values,
        datacenter_id: parseInt(id, 10)
      });
      await fetchFacilities();  // 立即获取最新的设施列表
      setIsFacilityModalVisible(false);
      facilityForm.resetFields();
      message.success('设施创建成功');
    } catch (error) {
      console.error('Error creating facility:', error);
      message.error('创建设施失败');
    }
  };

  const handleFacilityClick = (facility) => {
    if (isEditMode) {
      setSelectedFacility(selectedFacility?.id === facility.id ? null : facility);
    } else {
      navigate(`/facility/${facility.id}`);
    }
  };

  const handleFacilityDragMove = (e) => {
    const node = e.target;
    const facility = tempFacilities.find(f => f.id === node.attrs.id);
    if (!facility) return;

    const stage = node.getStage();
    const scale = grid_size/4;
    const pos = node.position();

    // 获取滚动容器
    const containerRect = stage.container().parentElement.getBoundingClientRect();
    const mouseX = e.evt.clientX - containerRect.left;
    const scrollThreshold = 100;

    // 根据鼠标位置决定滚动方向
    if (mouseX > containerRect.width - scrollThreshold) {
      startAutoScroll(1); // 向右滚动
    } else if (mouseX < scrollThreshold) {
      startAutoScroll(-1); // 向左滚动
    } else {
      stopAutoScroll(); // 停止滚动
    }

    // 限制拖动范围
    const maxX = Math.floor(width * 2 / (grid_size/4)) - Math.ceil(facility.width * 4);
    const maxY = Math.floor(height / (grid_size/4)) - Math.ceil(facility.height * 4);
    const gridX = Math.round(pos.x / scale);
    const gridY = Math.round(pos.y / scale);
    const boundedGridX = Math.max(0, Math.min(gridX, maxX));
    const boundedGridY = Math.max(0, Math.min(gridY, maxY));

    node.position({
      x: boundedGridX * scale,
      y: boundedGridY * scale
    });
  };

  const handleFacilityDragEnd = async (e, facility) => {
    stopAutoScroll();
    const node = e.target;
    const pos = node.position();
    const gridX = Math.round(pos.x / ((grid_size/4) * scale));
    const gridY = Math.round(pos.y / ((grid_size/4) * scale));
    const maxGridX = Math.floor(width / (grid_size/4)) - Math.ceil(facility.width * 4);
    const maxGridY = Math.floor(height / (grid_size/4)) - Math.ceil(facility.height * 4);
    const boundedGridX = Math.max(0, Math.min(gridX, maxGridX));
    const boundedGridY = Math.max(0, Math.min(gridY, maxGridY));

    // 计算旋转后的设施边界
    const rotation = facility.rotation || 0;
    const radians = (rotation * Math.PI) / 180;
    const facilityWidth = Math.ceil(facility.width * 4);
    const facilityHeight = Math.ceil(facility.height * 4);
    
    // 计算旋转后的四个角点坐标
    const corners = [
      { x: boundedGridX, y: boundedGridY },
      { x: boundedGridX + facilityWidth * Math.cos(radians), y: boundedGridY + facilityWidth * Math.sin(radians) },
      { x: boundedGridX + facilityWidth * Math.cos(radians) - facilityHeight * Math.sin(radians), 
        y: boundedGridY + facilityWidth * Math.sin(radians) + facilityHeight * Math.cos(radians) },
      { x: boundedGridX - facilityHeight * Math.sin(radians), y: boundedGridY + facilityHeight * Math.cos(radians) }
    ];

    // 计算旋转后的边界框
    const rotatedBounds = {
      left: Math.min(...corners.map(c => c.x)),
      right: Math.max(...corners.map(c => c.x)),
      top: Math.min(...corners.map(c => c.y)),
      bottom: Math.max(...corners.map(c => c.y))
    };

    // 检查新位置是否与其他设施冲突
    const hasConflictWithFacilities = tempFacilities.some(f => {
      if (f.id === facility.id) return false;
      
      // 计算其他设施的旋转边界
      const otherRotation = f.rotation || 0;
      const otherRadians = (otherRotation * Math.PI) / 180;
      const otherWidth = Math.ceil(f.width * 4);
      const otherHeight = Math.ceil(f.height * 4);
      
      const otherCorners = [
        { x: f.position_x, y: f.position_y },
        { x: f.position_x + otherWidth * Math.cos(otherRadians), y: f.position_y + otherWidth * Math.sin(otherRadians) },
        { x: f.position_x + otherWidth * Math.cos(otherRadians) - otherHeight * Math.sin(otherRadians),
          y: f.position_y + otherWidth * Math.sin(otherRadians) + otherHeight * Math.cos(otherRadians) },
        { x: f.position_x - otherHeight * Math.sin(otherRadians), y: f.position_y + otherHeight * Math.cos(otherRadians) }
      ];

      const otherBounds = {
        left: Math.min(...otherCorners.map(c => c.x)),
        right: Math.max(...otherCorners.map(c => c.x)),
        top: Math.min(...otherCorners.map(c => c.y)),
        bottom: Math.max(...otherCorners.map(c => c.y))
      };

      // 检查边界框是否重叠
      return !(rotatedBounds.right <= otherBounds.left || 
               rotatedBounds.left >= otherBounds.right || 
               rotatedBounds.bottom <= otherBounds.top || 
               rotatedBounds.top >= otherBounds.bottom);
    });

    // 检查新位置是否与机柜冲突
    const hasConflictWithRacks = tempRacks.some(rack => {
      const rackBounds = {
        left: rack.position_x,
        right: rack.position_x + Math.ceil(rack.depth * 4),
        top: rack.position_y,
        bottom: rack.position_y + Math.ceil(rack.width * 4)
      };
      
      return !(rotatedBounds.right <= rackBounds.left || 
               rotatedBounds.left >= rackBounds.right || 
               rotatedBounds.bottom <= rackBounds.top || 
               rotatedBounds.top >= rackBounds.bottom);
    });

    if (hasConflictWithFacilities) {
      message.error('该位置已被其他设施占用');
      // 重置到原始位置
      node.position({
        x: facility.position_x * (grid_size/4) * scale,
        y: facility.position_y * (grid_size/4) * scale
      });
      return;
    }

    if (hasConflictWithRacks) {
      message.error('该位置与机柜位置冲突');
      // 重置到原始位置
      node.position({
        x: facility.position_x * (grid_size/4) * scale,
        y: facility.position_y * (grid_size/4) * scale
      });
      return;
    }

    // 更新临时位置
    setTempFacilities(tempFacilities.map(f => {
      if (f.id === facility.id) {
        return { 
          ...f, 
          position_x: boundedGridX,
          position_y: boundedGridY
        };
      }
      return f;
    }));

    // 设置最终位置（确保对齐到细分网格）
    node.position({
      x: boundedGridX * (grid_size/4) * scale,
      y: boundedGridY * (grid_size/4) * scale
    });
  };

  const handleEditFacility = (facility, e) => {
    e.stopPropagation();
    setEditingFacility(facility);
    editFacilityForm.setFieldsValue({
      name: facility.name,
      facility_type: facility.facility_type,
      width: facility.width,
      height: facility.height,
      rotation: facility.rotation || 0
    });
    setIsEditFacilityModalVisible(true);
  };

  const handleUpdateFacility = async (values) => {
    try {
      await axios.put(`http://localhost:8000/facilities/${editingFacility.id}`, {
        ...values,
        datacenter_id: parseInt(id, 10),
        position_x: editingFacility.position_x,
        position_y: editingFacility.position_y
      });
      fetchFacilities();
      setIsEditFacilityModalVisible(false);
      editFacilityForm.resetFields();
      message.success('设施信息更新成功');
    } catch (error) {
      console.error('Error updating facility:', error);
      message.error('更新设施信息失败');
    }
  };

  if (!datacenter) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px', 
        background: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        margin: '24px'
      }}>
        <h2>正在加载机房信息...</h2>
      </div>
    );
  }

  const totalPower = racks.reduce((sum, rack) => sum + rack.max_power, 0);
  const totalArea = datacenter.total_area;
  const rackCount = racks.length;

  const { width = 1000, height = 800, grid_size = 50 } = datacenter.floor_plan || {};
  // 修改缩放计算，使用更大的显示区域
  const scale = Math.min(1200 / width, 800 / height);
  
  // 计算实际显示尺寸
  const displayWidth = width * 2 * scale;
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
            extra={
              <div>
                {isEditMode && <Tag color="warning">编辑模式：可拖动设施和机柜调整位置</Tag>}
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsFacilityModalVisible(true)}
                  style={{ marginLeft: 8 }}
                >
                  添加设施
                </Button>
              </div>
            }
          >
            <div className="room-view-scroll-container" style={{ 
              display: 'flex', 
              justifyContent: 'flex-start',
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingBottom: '10px'
            }}>
              <Stage 
                width={displayWidth} 
                height={displayHeight}
                style={{ 
                  border: '1px solid #ddd',
                  background: '#F0F0F0',
                  minWidth: displayWidth
                }}
              >
                <Layer>
                  {/* 绘制网格线 - 修改为2倍宽度 */}
                  {Array.from({ length: Math.ceil(width * 2 / grid_size) * 4 + 1 }).map((_, i) => (
                    <Line
                      key={`grid-v-${i}`}
                      points={[
                        Math.round(i * (grid_size/4)) * scale,
                        0,
                        Math.round(i * (grid_size/4)) * scale,
                        displayHeight
                      ]}
                      stroke="#D0D0D0"
                      strokeWidth={1}
                      dash={[5, 2]}
                    />
                  ))}
                  {Array.from({ length: Math.ceil(height / grid_size) * 4 + 1 }).map((_, i) => (
                    <Line
                      key={`grid-h-${i}`}
                      points={[
                        0,
                        Math.round(i * (grid_size/4)) * scale,
                        displayWidth,
                        Math.round(i * (grid_size/4)) * scale
                      ]}
                      stroke="#D0D0D0"
                      strokeWidth={1}
                      dash={[5, 2]}
                    />
                  ))}

                  {/* 绘制设施 */}
                  {(isEditMode ? tempFacilities : facilities).map((facility) => {
                    const isHovered = hoveredFacility && hoveredFacility.id === facility.id;
                    const isSelected = selectedFacility && selectedFacility.id === facility.id;
                    const facilityWidth = facility.width * grid_size * scale;
                    const facilityHeight = facility.height * grid_size * scale;
                    return (
                      <Group
                        key={facility.id}
                        id={facility.id}
                        x={facility.position_x * (grid_size/4) * scale}
                        y={facility.position_y * (grid_size/4) * scale}
                        width={facilityWidth}
                        height={facilityHeight}
                        rotation={facility.rotation || 0}
                        onClick={() => handleFacilityClick(facility)}
                        onMouseEnter={() => setHoveredFacility(facility)}
                        onMouseLeave={() => setHoveredFacility(null)}
                        draggable={isEditMode}
                        onDragMove={handleFacilityDragMove}
                        onDragEnd={(e) => handleFacilityDragEnd(e, facility)}
                      >
                        <Rect
                          x={0}
                          y={0}
                          width={facilityWidth}
                          height={facilityHeight}
                          fill={FacilityTypeColors[facility.facility_type]}
                          opacity={0.7}
                          stroke={isSelected ? '#1890ff' : '#000'}
                          strokeWidth={isHovered ? 2 : 1}
                          dash={isHovered ? undefined : [5, 2]}
                          cornerRadius={2}
                        />
                        <Text
                          x={0}
                          y={facilityHeight / 2 - 12}
                          width={facilityWidth}
                          text={facility.name}
                          fontSize={12 * scale}
                          fill="#000"
                          align="center"
                        />
                        <Text
                          x={0}
                          y={facilityHeight / 2 + 2}
                          width={facilityWidth}
                          text={FacilityTypeNames[facility.facility_type]}
                          fontSize={10 * scale}
                          fill="#000"
                          align="center"
                        />
                      </Group>
                    );
                  })}

                  {/* 绘制机柜（CAD风格） */}
                  {(isEditMode ? tempRacks : racks).map((rack) => {
                    const isHovered = hoveredRack && hoveredRack.id === rack.id;
                    const isSelected = selectedRack && selectedRack.id === rack.id;
                    const rackWidth = rack.depth * grid_size/4 * scale * 4;
                    const rackDepth = rack.width * grid_size/4 * scale * 4;
                    return (
                      <Group
                        key={rack.id}
                        id={rack.id}
                        x={rack.position_x * (grid_size/4) * scale}
                        y={rack.position_y * (grid_size/4) * scale}
                        width={rackWidth}
                        height={rackDepth}
                        onClick={() => handleRackClick(rack)}
                        onMouseEnter={() => setHoveredRack(rack)}
                        onMouseLeave={() => setHoveredRack(null)}
                        draggable={isEditMode}
                        onDragMove={handleRackDragMove}
                        onDragEnd={(e) => handleRackDragEnd(e, rack)}
                      >
                        <Rect
                          x={0}
                          y={0}
                          width={rackWidth}
                          height={rackDepth}
                          fill="#FFFFFF"
                          stroke={isSelected ? '#1890ff' : '#000000'}
                          strokeWidth={isHovered || isSelected ? 2 : 1}
                          dash={isHovered || isSelected ? undefined : [5, 2]}
                        />
                        <Text
                          x={0}
                          y={rackDepth / 2 - 12}
                          width={rackWidth}
                          text={rack.name}
                          fontSize={12 * scale}
                          fill={isSelected ? '#1890ff' : '#000'}
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
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
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
            </div>
          </Card>

          <Card title="设施列表" style={{ marginBottom: '24px' }}>
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
              {facilities.map((facility) => (
                <div
                  key={facility.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    background: hoveredFacility?.id === facility.id ? '#e6f7ff' : '#fff'
                  }}
                  onClick={() => handleFacilityClick(facility)}
                  onMouseEnter={() => setHoveredFacility(facility)}
                  onMouseLeave={() => setHoveredFacility(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{facility.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        类型：{FacilityTypeNames[facility.facility_type]}
                      </div>
                    </div>
                    {!isEditMode && (
                      <div>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(e) => handleEditFacility(facility, e)}
                          style={{ marginRight: '8px' }}
                        />
                        <Popconfirm
                          title="确定要删除这个设施吗？"
                          description={
                            <div>
                              <p>设施名称：{facility.name}</p>
                              <p>类型：{FacilityTypeNames[facility.facility_type]}</p>
                              <p style={{ color: '#ff4d4f' }}>删除后将无法恢复！</p>
                            </div>
                          }
                          onConfirm={(e) => {
                            e.stopPropagation();
                            handleDeleteFacility(facility.id);
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
            </div>
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
                label="X坐标（网格）"
                rules={[{ required: true, message: '请输入X坐标' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：8" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position_y"
                label="Y坐标（网格）"
                rules={[{ required: true, message: '请输入Y坐标' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：8" />
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

      <Modal
        title="添加设施"
        open={isFacilityModalVisible}
        onCancel={() => setIsFacilityModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={facilityForm} onFinish={handleCreateFacility} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="设施名称"
                rules={[{ required: true, message: '请输入设施名称' }]}
              >
                <Input placeholder="例如：空调-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="facility_type"
                label="设施类型"
                rules={[{ required: true, message: '请选择设施类型' }]}
              >
                <Select placeholder="请选择设施类型">
                  {Object.entries(FacilityTypeNames).map(([key, value]) => (
                    <Option key={key} value={key}>{value}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="width"
                label="宽度（米）"
                rules={[{ required: true, message: '请输入宽度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="height"
                label="高度（米）"
                rules={[{ required: true, message: '请输入高度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="rotation"
                label="旋转角度"
                initialValue={0}
              >
                <InputNumber min={0} max={360} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position_x"
                label="X坐标（网格）"
                rules={[{ required: true, message: '请输入X坐标' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：8" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position_y"
                label="Y坐标（网格）"
                rules={[{ required: true, message: '请输入Y坐标' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="例如：8" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              添加设施
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DatabaseOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            修改设施信息
          </div>
        }
        open={isEditFacilityModalVisible}
        onCancel={() => setIsEditFacilityModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={editFacilityForm} onFinish={handleUpdateFacility} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="设施名称"
                rules={[{ required: true, message: '请输入设施名称' }]}
              >
                <Input placeholder="例如：空调-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="facility_type"
                label="设施类型"
                rules={[{ required: true, message: '请选择设施类型' }]}
              >
                <Select placeholder="请选择设施类型">
                  {Object.entries(FacilityTypeNames).map(([key, value]) => (
                    <Option key={key} value={key}>{value}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="width"
                label="宽度（米）"
                rules={[{ required: true, message: '请输入宽度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="height"
                label="高度（米）"
                rules={[{ required: true, message: '请输入高度' }]}
              >
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="rotation"
                label="旋转角度"
                initialValue={0}
              >
                <InputNumber min={0} max={360} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<CheckOutlined />}>
              更新设施信息
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomView; 