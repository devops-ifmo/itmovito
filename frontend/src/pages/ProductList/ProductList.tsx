import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  type Theme,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { routerUrls } from '@/App';
import { fetchProducts, productKeys } from '@/api/products';
import ProductCard from '@/components/features/ProductCard';

const ProductList = () => {
  const navigate = useNavigate();

  const { isPending, isError, data } = useQuery({
    queryKey: productKeys.list(),
    queryFn: () => fetchProducts(),
  });

  if (isPending) {
    return (
      <Container sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">Не удалось загрузить товары.</Alert>
      </Container>
    );
  }

  const goToCreate = () =>
    void navigate(routerUrls.product.createPage.create());

  return (
    <Container sx={{ py: 6 }}>
      <Stack
        component="form"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Каталог
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Объявления о продаже и аренде
          </Typography>
        </Box>
        <Button variant="contained" size="large" onClick={goToCreate}>
          Добавить товар
        </Button>
      </Stack>

      {data.length === 0 ? (
        <Box
          sx={{
            py: 8,
            px: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            border: (theme: Theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Пока нет товаров
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Создайте первое объявление, чтобы оно появилось в каталоге.
          </Typography>
          <Button variant="contained" onClick={goToCreate}>
            Создать товар
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 3,
            alignItems: 'stretch',
          }}
        >
          {data.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              to={routerUrls.product.item.create(product.id)}
            />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default ProductList;
