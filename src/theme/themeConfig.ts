import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    // Brand colors
    colorPrimary: '#1677FF',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    colorInfo: '#1677FF',

    // Neutral colors
    colorTextBase: '#000000',
    colorBgBase: '#FFFFFF',

    // Font
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,

    // Border radius
    borderRadius: 6,

    // Spacing
    sizeStep: 4,
    sizeUnit: 4,

    // Wireframe mode
    wireframe: false,
  },
  components: {
    Button: {
      borderRadius: 6,
    },
    Card: {
      borderRadius: 8,
    },
    Input: {
      borderRadius: 6,
    },
    Select: {
      borderRadius: 6,
    },
    Table: {
      borderRadius: 6,
    },
    Modal: {
      borderRadius: 8,
    },
    Menu: {
      borderRadius: 6,
    },
  },
};

export default theme;
