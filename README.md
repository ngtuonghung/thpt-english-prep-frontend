# THPT English Prep Frontend

Ứng dụng luyện thi trắc nghiệm tiếng Anh dành cho học sinh cấp 3 chuẩn bị ôn thi THPT Quốc Gia. Ứng dụng kết hợp chấm điểm tự động và chatbot AI hỗ trợ giải thích câu hỏi.

**Demo:** https://dircuy355yl78.cloudfront.net/

## Tính năng chính

- Thi thử trực tuyến với thời gian 50 phút.
- Nhiều dạng câu hỏi: sắp xếp câu, điền từ, đọc hiểu.
- Chấm điểm tự động.
- Chatbot AI giải thích đáp án và hỗ trợ học tập
- Tạo đề thi tự động bằng AI.
- Lưu trữ lịch sử làm bài và xem lại đáp án.
- Phân quyền người dùng (admin/học sinh).

## Công nghệ sử dụng

### Frontend
- Node.js
- React 19.2.0
- React Router DOM 7.9.6
- Vite 7.2.2

### Backend & Cloud Services
- Amazon Cognito (xác thực người dùng)
- AWS Lambda (serverless functions)
- Amazon API Gateway (REST API)
- Amazon DynamoDB (cơ sở dữ liệu)
- Amazon S3 (lưu trữ tĩnh)
- Amazon CloudFront (CDN)

### AI Models
- Google Gemini API 2.5 Flash
- IBM WatsonX (Llama-3 70B)

## Cấu trúc dự án

```
src/
├── components/          # Các component tái sử dụng
│   ├── ConfirmModal
│   ├── ExamHistory
│   ├── Notification
│   ├── QuestionsContent
│   ├── QuestionsList
│   ├── TopBar
│   └── UserMenu
├── pages/              # Các trang chính
│   ├── Dashboard       # Trang chủ
│   ├── Exam           # Giao diện làm bài thi
│   ├── Submission     # Kết quả và xem lại
│   └── ReviewQuiz     # Luyện tập với AI
└── App.jsx            # Component gốc
```

## Hướng dẫn phát triển

### Yêu cầu
- Node.js v24 trở lên.
- AWS CLI đã được cấu hình.

### Cài đặt và chạy

```bash
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển
npm run dev

# Build production
npm run build

# Xem trước bản build
npm run preview
```

## Triển khai frontend

Frontend được triển khai qua AWS S3 và CloudFront. Sử dụng script tự động:

```bash
./deploy-to-s3.sh
```

Script sẽ tự động build và đẩy lên S3, sau đó làm mới CloudFront cache.