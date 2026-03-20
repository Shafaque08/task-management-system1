class Task {
  final String id;
  final String title;
  final String? description;
  final String status;

  Task({
    required this.id,
    required this.title,
    this.description,
    required this.status,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      status: json['status'] ?? 'TODO',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status,
    };
  }
}
