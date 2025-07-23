import React from 'react';

import '../styles/mobileWhiteboard.css';

const ToolbarButton: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div className="icon-placeholder" />
    <span className="icon-label">{label}</span>
  </div>
);

const MobileWhiteboard: React.FC = () => {

  return (
    <div className="mobile-whiteboard">
      {/* 顶部返回按钮 */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 15 }} onClick={() => window.history.back()}>
        {/* 简单返回箭头占位 */}
        <div className="icon-placeholder" style={{ width: 20, height: 20 }} />
      </div>

      {/* 画布区域 */}
      <div className="dotted-bg">
        {/* 中心占位插画与文字，可后续删除 */}
        <div style={{ textAlign: 'center' }}>
          <div className="icon-placeholder" style={{ width: 120, height: 120, borderRadius: 60, margin: '0 auto' }} />
          <p style={{ color: '#b0b0b0', marginTop: 12 }}>Start from JuJubit</p>
        </div>
      </div>

      {/* 浮动操作按钮 */}
      <div className="fab">
        {/* 发送箭头占位 */}
        <span style={{ fontWeight: 'bold' }}>▶</span>
      </div>

      {/* 底部工具栏 */}
      <div className="bottom-toolbar">
        <ToolbarButton label="Camera" />
        <ToolbarButton label="Text" />
        <ToolbarButton label="Paint" />
        <ToolbarButton label="More" />
      </div>
    </div>
  );
};

export default MobileWhiteboard;
