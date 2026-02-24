## Deploy in Production
to deploy this project on docker swarm cluster follow blow steps.
### 1. Create secrets (if needed)
```bash
echo "your_secrets_here" | docker secret create app_secrets -

# Create secret from direct input
echo "my-super-secret-password" | docker secret create mysql_password -

# Create JWT secret
echo "jwt-secret-key-xyz123" | docker secret create jwt_secret -

# Create API key
echo "sk-1234567890abcdef" | docker secret create api_key -


# Or create individual secrets from .env values
docker secret create mysql_password <(grep MYSQL_PASSWORD .env | cut -d '=' -f2)
docker secret create jwt_secret <(grep JWT_SECRET .env | cut -d '=' -f2)
```


### 2. Create config from .env file

```bash
docker config create app_config .env
```

### 3. Deploy
```bash
docker stack deploy -c docker-compose.swarm.yml nestjs-stack
```

### 4. Check status
```bash
docker stack services nestjs-stack
```

#### More
Ali Fattahi @ LastSecond