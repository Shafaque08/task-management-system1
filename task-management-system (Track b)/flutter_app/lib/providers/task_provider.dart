import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class TaskProvider with ChangeNotifier {
  final AuthProvider? authProvider;
  final ApiService _apiService = ApiService();

  List<Task> _tasks = [];
  bool _isLoading = false;
  int _currentPage = 1;
  bool _hasMore = true;
  String _searchQuery = '';
  String? _statusFilter;

  List<Task> get tasks => _tasks;
  bool get isLoading => _isLoading;
  bool get hasMore => _hasMore;

  TaskProvider(this.authProvider);

  Future<void> fetchTasks({bool refresh = false}) async {
    if (authProvider == null || !authProvider!.isAuthenticated) return;
    
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _tasks.clear();
    }

    if (!_hasMore || _isLoading) return;

    _isLoading = true;
    notifyListeners();

    try {
      String url = '/tasks?page=$_currentPage&limit=15';
      if (_searchQuery.isNotEmpty) url += '&search=$_searchQuery';
      if (_statusFilter != null) url += '&status=$_statusFilter';

      final response = await _apiService.get(url);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> tasksJson = data['tasks'];
        
        if (tasksJson.isEmpty) {
          _hasMore = false;
        } else {
          _tasks.addAll(tasksJson.map((json) => Task.fromJson(json)).toList());
          _currentPage++;
        }
      } else if (response.statusCode == 401) {
        authProvider!.logout();
      }
    } catch (e) {
      // Handle error
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    fetchTasks(refresh: true);
  }

  void setStatusFilter(String? status) {
    _statusFilter = status;
    fetchTasks(refresh: true);
  }

  Future<String?> addTask(String title, String description) async {
    try {
      final response = await _apiService.post('/tasks', {
        'title': title,
        'description': description,
      });
      if (response.statusCode == 201) {
        fetchTasks(refresh: true);
        return null;
      }
      return 'Failed to add task';
    } catch (e) {
      return 'Network error';
    }
  }

  Future<String?> updateTask(String id, String title, String description) async {
    try {
      final response = await _apiService.patch('/tasks/$id', {
        'title': title,
        'description': description,
      });
      if (response.statusCode == 200) {
        final index = _tasks.indexWhere((t) => t.id == id);
        if (index != -1) {
          _tasks[index] = Task.fromJson(jsonDecode(response.body));
          notifyListeners();
        }
        return null;
      }
      return 'Failed to update task';
    } catch (e) {
      return 'Network error';
    }
  }

  Future<String?> toggleTaskStatus(String id) async {
    try {
      final response = await _apiService.patch('/tasks/$id/toggle', {});
      if (response.statusCode == 200) {
        final index = _tasks.indexWhere((t) => t.id == id);
        if (index != -1) {
          _tasks[index] = Task.fromJson(jsonDecode(response.body));
          notifyListeners();
        }
        return null;
      }
      return 'Failed to toggle task';
    } catch (e) {
      return 'Network error';
    }
  }

  Future<String?> deleteTask(String id) async {
    try {
      final response = await _apiService.delete('/tasks/$id');
      if (response.statusCode == 200) {
        _tasks.removeWhere((t) => t.id == id);
        notifyListeners();
        return null;
      }
      return 'Failed to delete task';
    } catch (e) {
      return 'Network error';
    }
  }
}
