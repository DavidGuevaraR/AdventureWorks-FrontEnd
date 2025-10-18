import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from "./components/Login/login";
import Dashboard from "./components/dashboard/dashboard";
import PrivateRoute from "./router/PrivateRoute";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />  
      <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Login />} />

    </Routes>
  );
};