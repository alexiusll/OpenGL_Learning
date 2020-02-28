#pragma once
//引入相关头文件
#include <glad/glad.h>
#include<GLFW/glfw3.h>
#include <string>
//引入GLM
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

class Shader
{
public:
	//构建函数和解构函数
	~Shader();
	// 程序ID
	unsigned int ID;

	// 构造器读取并构建着色器
	Shader(const char* vertexPath, const char* fragmentPath);
	// 使用/激活程序
	void use();

	// uniform工具函数
	void setBool(const std::string& name, bool value) const;
	void setInt(const std::string& name, int value) const;
	void setFloat(const std::string& name, float value) const;
	void setMat4(const std::string& name, glm::mat4 value) const;
	void setVec3(const std::string& name, glm::vec3 value) const;
	void setVec3(const std::string& name, float x, float y, float z) const;

private:
	void checkCompileErrors(unsigned int shader, std::string type);
};