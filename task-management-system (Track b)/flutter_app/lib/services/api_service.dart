import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:3000/api'; // Use 10.0.2.2 for Android emulator
  final _storage = const FlutterSecureStorage();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'accessToken');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await _storage.read(key: 'refreshToken');
    if (refreshToken == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: 'accessToken', value: data['accessToken']);
        return true;
      }
    } catch (e) {
      // Refresh failed
    }
    return false;
  }

  Future<http.Response> get(String endpoint) async {
    var response = await http.get(Uri.parse('$baseUrl$endpoint'), headers: await _getHeaders());
    if (response.statusCode == 401) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        response = await http.get(Uri.parse('$baseUrl$endpoint'), headers: await _getHeaders());
      }
    }
    return response;
  }

  Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    var response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _getHeaders(),
      body: jsonEncode(body),
    );
    if (response.statusCode == 401 && !endpoint.contains('auth')) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        response = await http.post(
          Uri.parse('$baseUrl$endpoint'),
          headers: await _getHeaders(),
          body: jsonEncode(body),
        );
      }
    }
    return response;
  }

  Future<http.Response> patch(String endpoint, Map<String, dynamic> body) async {
    var response = await http.patch(
      Uri.parse('$baseUrl$endpoint'),
      headers: await _getHeaders(),
      body: jsonEncode(body),
    );
    if (response.statusCode == 401) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        response = await http.patch(
          Uri.parse('$baseUrl$endpoint'),
          headers: await _getHeaders(),
          body: jsonEncode(body),
        );
      }
    }
    return response;
  }

  Future<http.Response> delete(String endpoint) async {
    var response = await http.delete(Uri.parse('$baseUrl$endpoint'), headers: await _getHeaders());
    if (response.statusCode == 401) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        response = await http.delete(Uri.parse('$baseUrl$endpoint'), headers: await _getHeaders());
      }
    }
    return response;
  }
}
