# Compressed Size Action Demo

这是一个简化版的 GitHub Action，用于检查代码变更前后的文件压缩大小差异。

## 功能

- 检测指定文件的压缩大小
- 比较变更前后的大小差异
- 支持自定义文件匹配模式

## 配置

```yaml
- uses: ./
  with:
    # GitHub token，用于访问 API
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    
    # 压缩算法：'gzip' 或 'brotli'
    compression: 'gzip'
    
    # 要检查的文件匹配模式
    pattern: '**/dist/**/*.{js,mjs,cjs}'
    
    # 要排除的文件匹配模式
    exclude: '{**/*.map,**/node_modules/**}'
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build
```