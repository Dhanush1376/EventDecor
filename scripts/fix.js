const fs = require('fs');
let code = fs.readFileSync('frontend/src/admin/pages/AdminAddProduct.jsx', 'utf8');

if (!code.includes('@tanstack/react-query')) {
  code = code.replace(
    "import { useDraft } from '../hooks/useDraft';",
    "import { useDraft } from '../hooks/useDraft';\nimport { useQueryClient } from '@tanstack/react-query';"
  );
}

if (!code.includes('const queryClient = useQueryClient();')) {
  code = code.replace(
    "  const navigate = useNavigate();\n  const { refreshProducts } = useAdmin();",
    "  const navigate = useNavigate();\n  const queryClient = useQueryClient();\n  const { refreshProducts } = useAdmin();"
  );
}

if (!code.includes('queryClient.invalidateQueries')) {
  code = code.replace(
    "toast.success(isEditMode ? 'Product updated' : 'Product published');",
    "toast.success(isEditMode ? 'Product updated' : 'Product published');\n        queryClient.invalidateQueries({ queryKey: ['products'] });\n        queryClient.invalidateQueries({ queryKey: ['categories'] });"
  );
}

fs.writeFileSync('frontend/src/admin/pages/AdminAddProduct.jsx', code);
console.log('Fixed React Query cache invalidation');
