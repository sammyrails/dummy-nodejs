export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductBody {
  name: string;
  description?: string;
  price: number;
  stock?: number;
}

export interface UpdateProductBody {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  trace_id?: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}
