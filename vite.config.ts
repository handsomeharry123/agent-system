import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // 监听 0.0.0.0，避免仅 localhost 绑定带来的网络栈差异
    port: 3001,
    strictPort: true,  // 固定使用 3001，避免自动顺延后原访问地址失效
    clearScreen: false,// 保留历史输出，方便看到 transform 报错
    // 允许通过内网地址、容器代理和临时预览域名访问开发服务器。
    // 否则 Vite 会在请求进入 React 路由前直接返回 Host not allowed。
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 3001,
    strictPort: true,
    allowedHosts: true,
  },
  // dev 阶段关闭预构建可能导致的卡顿，方便定位首屏
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
  logLevel: 'info',
});
