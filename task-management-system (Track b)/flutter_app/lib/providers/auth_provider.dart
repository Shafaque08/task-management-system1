import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  bool _isAuthenticated = false;
  bool _isLoading = true;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;

  AuthProvider() {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await _storage.read(key: 'accessToken');
    _isAuthenticated = token != null;
    _isLoading = false;
    notifyListeners();
  }

  Future<String?> login(String email, String password) async {
    try {
      final response = await _apiService.post('/auth/login', {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: 'accessToken', value: data['accessToken']);
        await _storage.write(key: 'refreshToken', value: data['refreshToken']);
        _isAuthenticated = true;
        notifyListeners();
        return null;
      } else {
        return jsonDecode(response.body)['error'] ?? 'Login failed';
      }
    } catch (e) {
      return 'Network error';
    }
  }

  Future<String?> register(String email, String password, String name) async {
    try {
      final response = await _apiService.post('/auth/register', {
        'email': email,
        'password': password,
        'name': name,
      });

      if (response.statusCode == 201) {
        return null; // Success
      } else {
        return jsonDecode(response.body)['error'] ?? 'Registration failed';
      }
    } catch (e) {
      return 'Network error';
    }
  }

  Future<void> logout() async {
    await _apiService.post('/auth/logout', {});
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
    _isAuthenticated = false;
    notifyListeners();
  }
}
