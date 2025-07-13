# Smart Parking Detection System (位無一失)

## Overview

This is a full-stack web application built for smart parking detection around Taiwan Tech University. The system uses AI technology to provide real-time parking spot availability information through an interactive map interface. Users can view parking spots, manage favorites, upload images/videos for analysis, and contact the system administrators.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Maps Integration**: Google Maps API for interactive parking spot visualization
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **File Uploads**: Multer middleware for handling image/video uploads
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Replit Auth integration with OpenID Connect

### Database Architecture
- **Database**: PostgreSQL with Neon serverless provider
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Relational design with proper foreign key relationships
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Authentication System
- Replit Auth integration using OpenID Connect protocol
- Session-based authentication with PostgreSQL session storage
- User profile management with automatic session updates
- Protected routes requiring authentication

### Parking Management
- Real-time parking spot data with availability tracking
- Google Maps integration for visual spot representation
- Color-coded indicators (green=available, yellow=limited, red=full)
- Location-based services centered around Taiwan Tech University

### User Features
- Personal favorites system for frequently used parking spots
- Image/video upload functionality for parking spot analysis
- Contact form for user feedback and support requests
- Responsive design optimized for mobile and desktop

### File Upload System
- Support for JPEG, PNG images and MP4 videos
- 50MB file size limit with proper validation
- Organized file storage with metadata tracking
- Processing status tracking for uploaded content

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, sessions stored in PostgreSQL
2. **Parking Data**: Real-time parking spot data fetched from backend API
3. **Map Visualization**: Google Maps displays parking spots with availability indicators
4. **User Actions**: Favorites, uploads, and contact messages stored in database
5. **File Processing**: Uploaded files stored locally with metadata in database

## External Dependencies

### Required Services
- **Neon Database**: PostgreSQL hosting for data persistence
- **Google Maps API**: Map visualization and location services
- **Replit Auth**: User authentication and authorization

### Key Libraries
- **UI Framework**: React with Radix UI components
- **Database**: Drizzle ORM with Neon serverless driver
- **File Handling**: Multer for multipart form data
- **Maps**: Google Maps JavaScript API
- **Styling**: Tailwind CSS with shadcn/ui components

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- Express server with TypeScript compilation via tsx
- Environment variables for database and API keys
- Replit integration with development banner

### Production Build
- Frontend: Vite build to static assets
- Backend: esbuild bundling for Node.js deployment
- Database migrations via Drizzle Kit
- Environment-based configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OpenID Connect issuer URL
- `REPLIT_DOMAINS`: Allowed domains for CORS

## Recent Changes
- **街景與OAuth改進** (2025-07-05): 修復關鍵功能並完善用戶登入體驗
  - Google Earth街景修復：使用KML參考的相機視角參數（altitude=500, tilt=75）
  - 影片查看404修復：管理員後台和用戶共享平台正確指向API路由
  - Google OAuth完善：改進錯誤處理、用戶名生成、登入狀態反饋
  - 影片檔案服務：新增專用API路由支援影片串流播放
- **社群共享功能** (2025-07-05): 新增影片共享平台和街景動畫改進
  - 共享影片平台：有上傳記錄的用戶可查看所有用戶的影片
  - 權限控制機制：未上傳用戶無法訪問共享功能，顯示提示訊息
  - 街景動畫優化：使用指定的Google Earth URL格式（100a,500d,60y,45t）
  - 完整搜尋篩選：支援用戶、檔案大小、時間等多維度篩選
- **系統穩定性提升** (2025-07-05): 解決關鍵技術問題並改善用戶體驗
  - 頁面404修復：改善前端路由配置，解決重新整理後的導航問題
  - Google Earth街景整合：使用網頁版Google Earth實現自動小黃人降落動畫
  - 影片管理系統：500MB上傳限制，完整的管理員刪除功能
  - 路由狀態管理：優化載入狀態和認證流程，減少頁面閃爍
- **用戶體驗優化** (2025-07-05): 修復關鍵功能並改善用戶界面
  - 個人設定改為彈出對話框：避免導航困難，可在任何頁面使用
  - 街景動畫增強：地圖標記點擊後透過Google Earth實現真正的小黃人降落效果
  - 影片上傳修復：修正multer欄位名稱錯誤，解決中文檔名編碼問題
  - 管理員影片管理：顯示正確的用戶名和檔案大小，新增刪除功能
  - 管理員通知系統：管理員回覆用戶反饋時自動推送通知
- **完整功能系統** (2025-07-05): 添加用戶通知系統、密碼修改功能和管理員影片管理
  - 用戶通知系統：管理員回覆會自動推送通知到用戶
  - 密碼修改功能：用戶和管理員都可以修改密碼
  - 管理員影片管理：查看所有用戶上傳的影片，為AI模型應用做準備
  - 個人設定頁面：統一管理通知和密碼修改
  - 管理員會話修復：使用獨立會話系統避免與普通用戶衝突
- **街景視圖優化** (2025-07-05): 停車格標記點擊直接跳轉Google街景，實現"丟小黃人"效果
- **Google OAuth配置** (2025-07-05): 提供完整的回調URL配置指南
- **管理員後台系統** (2025-07-04): 完整的管理員認證與後台管理系統
  - 獨立管理員登入系統（/admin/login）
  - 管理員控制面板（/admin/dashboard）
  - 使用者回饋管理和回覆功能
  - 停車格CRUD操作和資料庫監控
  - 預設管理員帳號：admin / admin123456

## Changelog
- June 30, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.