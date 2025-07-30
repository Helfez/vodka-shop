import React from 'react';

interface IPadPreviewProps {
  imageUrl?: string | null;
  loading?: boolean;
}

const IPadPreview: React.FC<IPadPreviewProps> = ({ imageUrl, loading }) => {
  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>预览</h3>
      
      <div style={{ 
        flex: 1, 
        border: '1px solid #e5e5e5', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        minHeight: '300px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #e5e5e5', 
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#6b7280', margin: 0 }}>生成中...</p>
          </div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Generated" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              borderRadius: '4px'
            }} 
          />
        ) : (
          <p style={{ color: '#9ca3af', textAlign: 'center' }}>
            在画布上创作，然后点击生成按钮
          </p>
        )}
      </div>

      {imageUrl && !loading && (
        <div style={{ marginTop: '16px' }}>
          <button
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f97316',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
          >
            立即购买
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default IPadPreview;
