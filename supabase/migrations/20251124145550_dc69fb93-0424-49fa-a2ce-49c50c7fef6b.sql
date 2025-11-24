-- Grant admin role to the app owner
INSERT INTO user_roles (user_id, role) 
VALUES ('75dad050-2c10-4f1a-8cd8-bebdea602a93', 'admin'::app_role);