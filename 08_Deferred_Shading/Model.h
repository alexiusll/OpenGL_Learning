#pragma once
#include <string>
#include <vector>
#include <iostream>
//加入assimp库
#include <assimp/Importer.hpp>
#include <assimp/scene.h>
#include <assimp/postprocess.h>

#include "Shader.h"
#include "Mesh.h"
class Model
{
public:
	Model(const char *path)
	{
		loadModel(path);
	}
	void Draw(Shader shader); //渲染模型
private:
	//模型数据
	std::vector<Mesh> meshes;
	std::string directory;
	std::vector<Texture> textures_loaded;
	//私有函数
	void loadModel(std::string path);
	void processNode(aiNode *node, const aiScene *scene);
	Mesh processMesh(aiMesh *mesh, const aiScene *scene);
	std::vector<Texture> loadMaterialTextures(aiMaterial *mat, aiTextureType type,
		std::string typeName);
};
