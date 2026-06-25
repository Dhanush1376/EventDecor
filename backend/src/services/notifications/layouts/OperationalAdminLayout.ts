export const OperationalAdminLayout = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Notification</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.5;
    }
    .container {
      max-width: 800px;
      margin: 20px auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
    }
    .header {
      background: #18181b;
      color: #ffffff;
      padding: 16px 24px;
      border-radius: 6px 6px 0 0;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      background: #ef4444;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .content {
      padding: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th, td {
      border: 1px solid #e4e4e7;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f4f4f5;
      font-weight: 600;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #09090b;
        color: #f4f4f5;
      }
      .container {
        background: #18181b;
        border-color: #27272a;
      }
      th, td {
        border-color: #27272a;
      }
      th {
        background: #27272a;
      }
      .header {
        background: #000000;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span>Operational Intelligence</span>
      <span class="badge">ADMIN</span>
    </div>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>
`;
