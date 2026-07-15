# --- STAGE 1: Build
FROM golang:1.26-alpine AS builder
WORKDIR /app

# Dependency installation
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile
RUN CGO_ENABLED=0 GOOS=linux go build -o autora-backend ./main.go


# --- STAGE 2: Finale Image for production
FROM alpine:latest AS production
WORKDIR /root/

# Copy final binary from first stage
COPY --from=builder /app/autora-backend .

# Expose the port
EXPOSE 8080

CMD [ "./autora-backend" ]