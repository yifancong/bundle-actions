# GitHub Token Permission Configuration Guide

## 🔑 Resolving "Resource not accessible by personal access token" Error

### Problem Cause
This error indicates that your Personal Access Token does not have sufficient permissions to access the required resources.

### Solution

#### 1. **Create New Personal Access Token**

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" → "Generate new token (classic)"

#### 2. **Configure Required Permissions**

For private repositories, the following permissions are required:

```
✅ repo (Full repository access)
  ├── repo:status          # Read repository status
  ├── repo_deployment      # Deployment permissions  
  ├── public_repo          # Public repository access
  ├── repo:invite          # Invitation permissions
  └── security_events      # Security events (optional)

✅ workflow (if modifying workflows)
✅ write:packages (if uploading packages)
✅ read:packages (if reading packages)
```

#### 3. **Fine-grained Token Configuration (Recommended)**

If using Fine-grained Personal Access Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Select "Selected repositories" and add your repository
4. Configure the following permissions:

```
Repository permissions:
✅ Contents: Read
✅ Actions: Read  
✅ Metadata: Read
✅ Pull requests: Read
✅ Checks: Read
```

#### 4. **Verify Token Permissions**

Add permission verification step in CI:

```yaml
- name: Verify GitHub Token Permissions
  run: |
    echo "🔍 Testing GitHub API access..."
    curl -H "Authorization: token YOUR_TOKEN" \
         -H "Accept: application/vnd.github.v3+json" \
         "https://api.github.com/repos/OWNER/REPO" \
         | jq -r '.name, .private, .permissions'
```

### Common Issues and Solutions

#### Issue 1: 403 Forbidden
- **Cause**: Insufficient token permissions
- **Solution**: Ensure token has `repo` permission

#### Issue 2: 404 Not Found  
- **Cause**: Repository does not exist or is inaccessible
- **Solution**: Check repository name and token permissions

#### Issue 3: Artifacts Cannot Be Accessed
- **Cause**: Missing `actions:read` permission
- **Solution**: Ensure token has Actions-related permissions

### Security Best Practices

1. **Principle of Least Privilege**: Only grant necessary permissions
2. **Regular Rotation**: Regularly update tokens
3. **Usage Monitoring**: Monitor token usage
4. **Environment Isolation**: Use different tokens for different environments

### Permission Reference Table

| Function | Required Permission | Description |
|----------|-------------------|-------------|
| Read repository content | `contents:read` | Get branches, commit information |
| Read Actions | `actions:read` | Get workflow runs and artifacts |
| Read metadata | `metadata:read` | Get basic repository information |
| Private repository access | `repo` | Full repository access permission |
| Read PRs | `pull_requests:read` | Get PR information |
| Read checks | `checks:read` | Get check status |

### Troubleshooting

If you still encounter permission issues:

1. **Check if token has expired**
2. **Confirm if repository is private**
3. **Verify token access permissions for target repository**
4. **Check organization-level permission settings**
5. **Confirm no IP restrictions or other access limitations**